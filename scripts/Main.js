/* global widget, require */
        (function () {
            "use strict";

            var CONFIG = {
                debug: true,
                serviceName: "3DSpace",
                personEndpoint: "/resources/modeler/pno/person?current=true&select=collabspaces",
                requestTimeout: 60000
            };

            var gInitialized = false;
            var gWAFData = null;
            var gCompassServices = null;
            var gPlatforms = [];
            var gPlatformLabels = {};
            var gResults = [];

            function debugLog() {
                if (CONFIG.debug && window.console) {
                    console.log.apply(console, arguments);
                }
            }

            function setText(id, text) {
                var element = document.getElementById(id);
                if (element) {
                    element.textContent = text;
                }
            }

            function setStatus(message, kind) {
                var element = document.getElementById("status");
                if (!element) {
                    return;
                }

                element.className = "status" + (kind ? " " + kind : "");
                element.textContent = message;
            }

            function safeString(value) {
                if (value === null || typeof value === "undefined") {
                    return "";
                }
                return String(value);
            }

            function safeStringify(value) {
                try {
                    return JSON.stringify(value, null, 2);
                } catch (error) {
                    return String(value);
                }
            }

            function joinUrl(baseUrl, path) {
                return safeString(baseUrl).replace(/\/+$/, "") + "/" + safeString(path).replace(/^\/+/, "");
            }

            function withTenantQuery(url, platformId) {
                if (!platformId || /[?&]tenant=/.test(url)) {
                    return url;
                }

                return url + (url.indexOf("?") === -1 ? "?" : "&") + "tenant=" + encodeURIComponent(platformId);
            }

            function buildSecurityContext(roleName, organizationName, collabSpaceName) {
                return "ctx::" + roleName + "." + organizationName + "." + collabSpaceName;
            }

            function normalizePlatformId(platform) {
                if (typeof platform === "string") {
                    return platform;
                }

                if (!platform || typeof platform !== "object") {
                    return "";
                }

                return platform.platformId ||
                    platform.id ||
                    platform.platform ||
                    platform.name ||
                    platform.tenant ||
                    "";
            }

            function normalizePlatformLabel(platform, platformId) {
                var label = "";

                if (platform && typeof platform === "object") {
                    label = platform.displayName ||
                        platform.displayTitle ||
                        platform.title ||
                        platform.label ||
                        platform.tenantName ||
                        platform.platformName ||
                        platform.name ||
                        "";
                }

                label = safeString(label).trim();
                return label && label !== platformId ? label : "";
            }

            function extractPlatformIds(data) {
                var ids = [];

                function add(id, label) {
                    id = safeString(id).trim();
                    if (id && ids.indexOf(id) === -1) {
                        ids.push(id);
                    }

                    label = safeString(label).trim();
                    if (id && label && label !== id && !gPlatformLabels[id]) {
                        gPlatformLabels[id] = label;
                    }
                }

                if (typeof widget !== "undefined" && widget.getValue) {
                    add(widget.getValue("x3dPlatformId"));
                }

                if (Array.isArray(data)) {
                    data.forEach(function (entry) {
                        var id = normalizePlatformId(entry);
                        add(id, normalizePlatformLabel(entry, id));
                    });
                } else if (data && typeof data === "object") {
                    var dataId = normalizePlatformId(data);
                    add(dataId, normalizePlatformLabel(data, dataId));

                    Object.keys(data).forEach(function (key) {
                        var entryId = normalizePlatformId(data[key]);
                        var entryLabel = normalizePlatformLabel(data[key], entryId || key);
                        add(key, entryLabel);
                        add(entryId, entryLabel);
                    });
                }

                return ids;
            }

            function extractSecurityContextsFromPerson(data) {
                var contexts = [];
                var spaces = data && Array.isArray(data.collabspaces) ? data.collabspaces : [];

                spaces.forEach(function (space) {
                    var collabSpaceName = safeString(space.name);
                    var collabSpaceTitle = safeString(space.title);
                    var couples = Array.isArray(space.couples) ? space.couples : [];

                    couples.forEach(function (couple) {
                        var role = couple.role || {};
                        var organization = couple.organization || {};
                        var roleName = safeString(role.name);
                        var organizationName = safeString(organization.name);

                        if (!roleName || !organizationName || !collabSpaceName) {
                            return;
                        }

                        contexts.push({
                            collabSpaceName: collabSpaceName,
                            collabSpaceTitle: collabSpaceTitle,
                            roleName: roleName,
                            roleLabel: safeString(role.nls) || roleName,
                            organizationName: organizationName,
                            organizationTitle: safeString(organization.title) || organizationName,
                            securityContext: buildSecurityContext(roleName, organizationName, collabSpaceName)
                        });
                    });
                });

                return contexts;
            }

            function loadModules(onReady) {
                if (typeof require !== "function") {
                    setStatus("No se encuentra require(...). Abre este HTML como widget dentro de 3DEXPERIENCE.", "error");
                    return;
                }

                require([
                    "DS/WAFData/WAFData",
                    "DS/i3DXCompassServices/i3DXCompassServices"
                ], function (WAFData, i3DXCompassServices) {
                    gWAFData = WAFData;
                    gCompassServices = i3DXCompassServices;
                    onReady();
                });
            }

            function discoverPlatforms(onReady) {
                setStatus("Buscando plataformas y servicios 3DSpace disponibles...");

                if (!gCompassServices || !gCompassServices.getPlatformServices) {
                    onReady(extractPlatformIds(null));
                    return;
                }

                gCompassServices.getPlatformServices({
                    onComplete: function (data) {
                        debugLog("getPlatformServices", data);
                        onReady(extractPlatformIds(data));
                    },
                    onFailure: function (error) {
                        debugLog("getPlatformServices failure", error);
                        onReady(extractPlatformIds(null));
                    }
                });
            }

            function resolveSpaceUrl(platformId, onComplete) {
                gCompassServices.getServiceUrl({
                    serviceName: CONFIG.serviceName,
                    platformId: platformId,
                    onComplete: function (serviceUrl) {
                        if (typeof serviceUrl !== "string" || !serviceUrl) {
                            onComplete({
                                platformId: platformId,
                                serviceUrl: "",
                                contexts: [],
                                error: "No se pudo resolver la URL de 3DSpace."
                            });
                            return;
                        }

                        onComplete({
                            platformId: platformId,
                            serviceUrl: serviceUrl,
                            contexts: [],
                            error: ""
                        });
                    },
                    onFailure: function (error) {
                        debugLog("getServiceUrl failure", platformId, error);
                        onComplete({
                            platformId: platformId,
                            serviceUrl: "",
                            contexts: [],
                            error: "Fallo al resolver 3DSpace para esta plataforma."
                        });
                    }
                });
            }

            function fetchCurrentPerson(spaceInfo, onComplete) {
                if (!spaceInfo.serviceUrl) {
                    onComplete(spaceInfo);
                    return;
                }

                var url = withTenantQuery(joinUrl(spaceInfo.serviceUrl, CONFIG.personEndpoint), spaceInfo.platformId);

                gWAFData.authenticatedRequest(url, {
                    method: "GET",
                    type: "json",
                    timeout: CONFIG.requestTimeout,
                    headers: {
                        "Accept": "application/json;charset=UTF-8"
                    },
                    onComplete: function (data) {
                        debugLog("person current", spaceInfo.platformId, data);
                        spaceInfo.contexts = extractSecurityContextsFromPerson(data);
                        onComplete(spaceInfo);
                    },
                    onFailure: function (error, backendResponse, responseHeaders) {
                        debugLog("person failure", spaceInfo.platformId, error, backendResponse, responseHeaders);
                        spaceInfo.error = "No se pudo leer el usuario actual: " + safeStringify(error || backendResponse || "error desconocido");
                        onComplete(spaceInfo);
                    },
                    onTimeout: function (error) {
                        debugLog("person timeout", spaceInfo.platformId, error);
                        spaceInfo.error = "La petición al usuario actual ha agotado el tiempo de espera.";
                        onComplete(spaceInfo);
                    },
                    onPassportError: function (error) {
                        debugLog("person passport error", spaceInfo.platformId, error);
                        spaceInfo.error = "Passport requiere autenticación o no ha permitido la petición.";
                        onComplete(spaceInfo);
                    }
                });
            }

            function loadSpaceAt(index) {
                if (index >= gPlatforms.length) {
                    finishLoad();
                    return;
                }

                setStatus("Consultando 3DSpace " + (index + 1) + " de " + gPlatforms.length + ": " + gPlatforms[index]);

                resolveSpaceUrl(gPlatforms[index], function (spaceInfo) {
                    fetchCurrentPerson(spaceInfo, function (result) {
                        gResults.push(result);
                        render();
                        loadSpaceAt(index + 1);
                    });
                });
            }

            function finishLoad() {
                var contextCount = countContexts(gResults);
                var failedCount = gResults.filter(function (result) {
                    return !!result.error;
                }).length;

                if (!gResults.length) {
                    setStatus("No se ha encontrado ningún 3DSpace accesible desde este dashboard.", "error");
                    render();
                    return;
                }

                if (failedCount) {
                    setStatus("Carga terminada con avisos. Revisa los 3DSpace que muestran error.", "error");
                    return;
                }

                setStatus("Carga terminada. Contextos encontrados: " + contextCount + ".", "success");
            }

            function countContexts(results) {
                return results.reduce(function (total, result) {
                    return total + (Array.isArray(result.contexts) ? result.contexts.length : 0);
                }, 0);
            }

            function getFilteredResults() {
                var query = safeString(document.getElementById("search").value).toLowerCase();
                var platformFilter = safeString(document.getElementById("platformFilter").value);

                return gResults.map(function (result) {
                    var contexts = Array.isArray(result.contexts) ? result.contexts : [];

                    if (platformFilter && result.platformId !== platformFilter) {
                        contexts = [];
                    }

                    if (query) {
                        contexts = contexts.filter(function (context) {
                            return [
                                context.collabSpaceName,
                                context.collabSpaceTitle,
                                context.roleName,
                                context.roleLabel,
                                context.organizationName,
                                context.organizationTitle,
                                context.securityContext
                            ].join(" ").toLowerCase().indexOf(query) !== -1;
                        });
                    }

                    return {
                        platformId: result.platformId,
                        serviceUrl: result.serviceUrl,
                        error: result.error,
                        contexts: contexts
                    };
                }).filter(function (result) {
                    return !platformFilter || result.platformId === platformFilter;
                });
            }

            function renderSummary() {
                setText("platformCount", String(gResults.length));
                setText("contextCount", String(countContexts(gResults)));
                setText("errorCount", String(gResults.filter(function (result) {
                    return !!result.error;
                }).length));
            }

            function renderPlatformFilter() {
                var select = document.getElementById("platformFilter");
                var current = select.value;
                var html = "<option value=\"\">Todas las plataformas</option>";

                gResults.forEach(function (result) {
                    var selected = result.platformId === current ? " selected" : "";
                    var label = getPlatformDisplayName(result.platformId);
                    html += "<option value=\"" + escapeAttribute(result.platformId) + "\"" + selected + ">" +
                        escapeHtml(label) +
                        "</option>";
                });

                select.innerHTML = html;
            }

            function getPlatformDisplayName(platformId) {
                var label = gPlatformLabels[platformId];
                return label ? platformId + " - " + label : platformId;
            }

            function escapeHtml(value) {
                return safeString(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            }

            function escapeAttribute(value) {
                return escapeHtml(value);
            }

            function render() {
                renderSummary();
                renderPlatformFilter();

                var list = document.getElementById("spaceList");
                var results = getFilteredResults();
                var hasRows = results.some(function (result) {
                    return result.error || result.contexts.length;
                });

                if (!hasRows) {
                    list.innerHTML = "<div class=\"empty\">No hay contextos que coincidan con el filtro actual.</div>";
                    return;
                }

                list.innerHTML = results.map(function (result) {
                    var rows = "";

                    if (result.error) {
                        rows += "<div class=\"context-row\"><div class=\"context-main\">" +
                            "<div class=\"context-label\">Error</div>" +
                            "<div class=\"context-value\">" + escapeHtml(result.error) + "</div>" +
                            "</div></div>";
                    }

                    rows += result.contexts.map(function (context) {
                        return "<div class=\"context-row\">" +
                            "<div class=\"context-main\">" +
                            "<div class=\"context-label\">" + escapeHtml(context.collabSpaceName) + "</div>" +
                            "<div class=\"context-meta\">" +
                            escapeHtml(context.roleLabel) + " (" + escapeHtml(context.roleName) + ") / " +
                            escapeHtml(context.organizationTitle) +
                            "</div>" +
                            "<code class=\"context-value\">" + escapeHtml(context.securityContext) + "</code>" +
                            "</div>" +
                            "<button class=\"icon\" title=\"Copiar SecurityContext\" data-copy=\"" +
                            escapeAttribute(context.securityContext) +
                            "\">⧉</button>" +
                            "</div>";
                    }).join("");

                    return "<section class=\"space-card\">" +
                        "<div class=\"space-header\">" +
                        "<div>" +
                        "<h2 class=\"space-title\">" + escapeHtml(result.platformId || "3DSpace") + "</h2>" +
                        "<div class=\"space-url\">" + escapeHtml(result.serviceUrl || "URL no disponible") + "</div>" +
                        "</div>" +
                        "<div class=\"badge\">" + result.contexts.length + " contextos</div>" +
                        "</div>" +
                        "<div class=\"context-list\">" + rows + "</div>" +
                        "</section>";
                }).join("");
            }

            function copyText(text) {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function () {
                        setStatus("SecurityContext copiado.", "success");
                    }, function () {
                        fallbackCopyText(text);
                    });
                    return;
                }

                fallbackCopyText(text);
            }

            function fallbackCopyText(text) {
                var input = document.createElement("textarea");
                input.value = text;
                input.setAttribute("readonly", "readonly");
                input.style.position = "fixed";
                input.style.left = "-9999px";
                document.body.appendChild(input);
                input.select();

                try {
                    document.execCommand("copy");
                    setStatus("SecurityContext copiado.", "success");
                } catch (error) {
                    setStatus("No se ha podido copiar automáticamente. Selecciona el texto manualmente.", "error");
                }

                document.body.removeChild(input);
            }

            function startLoad() {
                gResults = [];
                gPlatforms = [];
                gPlatformLabels = {};
                render();

                loadModules(function () {
                    discoverPlatforms(function (platformIds) {
                        gPlatforms = platformIds;

                        if (!gPlatforms.length) {
                            setStatus("No se ha podido determinar el platformId. Comprueba que el widget se ejecuta dentro de 3DEXPERIENCE.", "error");
                            render();
                            return;
                        }

                        loadSpaceAt(0);
                    });
                });
            }

            function bindEvents() {
                document.getElementById("refresh").addEventListener("click", startLoad);
                document.getElementById("search").addEventListener("input", render);
                document.getElementById("platformFilter").addEventListener("change", render);
                document.getElementById("spaceList").addEventListener("click", function (event) {
                    var target = event.target;
                    if (target && target.getAttribute("data-copy")) {
                        copyText(target.getAttribute("data-copy"));
                    }
                });
            }

            function onWidgetReady() {
                if (gInitialized) {
                    return;
                }

                gInitialized = true;
                bindEvents();
                startLoad();
            }

            function boot() {
                if (typeof widget !== "undefined" && widget.addEvent) {
                    widget.addEvent("onLoad", onWidgetReady);
                    return;
                }

                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", onWidgetReady);
                } else {
                    onWidgetReady();
                }
            }

            boot();
        }());
