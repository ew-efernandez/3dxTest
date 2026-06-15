function executeWidgetCode() {
    require(["UWA/Drivers/jQuery", "DS/WAFData/WAFData", "DS/i3DXCompassServices/i3DXCompassServices", "DS/PlatformAPI/PlatformAPI", "DS/DataDragAndDrop/DataDragAndDrop", "DS/TagNavigatorProxy/TagNavigatorProxy"], function($, WAFData, i3DXCompassServices, PlatformAPI, DataDragAndDrop, TagNavigatorProxy) {
        var myWidget = {
			varServiceURL: "",
            dataFull: [],
			topicName: "clickUserId",
			
            displayData: function (arrData) {
				var $wdgBody = $(widget.body);
				
				$wdgBody.empty();
				
				var $table = $("<table></table>");
				
				$table.append("<thead><tr><th>Type</th><th>Name</th><th>revision</th><th>State</th></tr></thead>");
				
				var $tBody = $("<tbody></tbody>");

				for (var i = 0; i < arrData.length; i++) {
				  var $tr = $("<tr id='" + arrData[i].physicalid + "' rowSelected='false'><td>" 
				  + arrData[i].type 
				  + "</td><td>" 
				  + arrData[i].name 
				  + "</td><td>" 
				  + arrData[i].revision 
				  + "</td><td>" 
				  + arrData[i].current 
				  + "</td></tr>");
				  
				  $tr.on("click", myWidget.clicOnRow);
				  
				  $tBody.append($tr);
				  
				  myWidget.dragZone($tr);
				}

				$table.append($tBody);
				$wdgBody.append($table);
			},

            onLoadWidget: function() {
                myWidget.callData();
                myWidget.displayData(myWidget.dataFull);
            },

            onSearchWidget: function(searchQuery) {
                var arrResult = [];
				
				//Search with * to RegExp "*" can be any letter or number or "_" or "-"
				
				var regExpPattern = "^"+searchQuery.replace(/\*/g, "[\\w\\s0-9\\-]*")+"$"; 
				var searchRegExp = new RegExp(regExpPattern,"i");//case insensitive

				for(var i=0; i<myWidget.dataFull.length; i++) {
					var searchKeys=myWidget.dataFull[i];
					var objTest=Object.values(searchKeys);
					var oneValuesIsOK = false;
					for(var k=0; k < objTest.length; k++) {
						var searchKey=objTest[k];
						console.log(searchRegExp.test(searchKey));
						if(searchRegExp.test(searchKey)) {
							oneValuesIsOK = true;
							break;
						}
					}
					if(oneValuesIsOK) {
						arrResult.push(searchKeys);
					}
				}
                myWidget.displayData(arrResult);
            },

            onResetSearchWidget: function() {
                myWidget.displayData(myWidget.dataFull);
            },

            callData: function() {
				i3DXCompassServices.getServiceUrl({
				    serviceName: '3DSpace', 
				    platformId: widget.getValue('x3dPlatformId'),
				    onComplete : function (URLResult){
						myWidget.tableData(URLResult);
					},
					onFailure : function (error){
						console.log(error);
					}
				});				
			},
			
			tableData: function(serviceURL) {
				var urlWAF = serviceURL + "/DSISTools/Find";
				console.log(urlWAF);
                var dataWAF = {
                   type: widget.getValue("typeObj"),
                   selects: "attribute[*],current,name,revision"
                };
                var headerWAF = {
                   SecurityContext: widget.getValue("ctx")
                };
                var methodWAF = "GET";
                WAFData.authenticatedRequest(urlWAF, {
                   method: methodWAF,
                   headers: headerWAF,
                   data: dataWAF,
                   type: "json",
                   onComplete: function(dataResp) {
                       if (dataResp.msg === "OK") {
                           myWidget.dataFull = dataResp.data;
                           myWidget.displayData(myWidget.dataFull);
                           console.log(myWidget.dataFull);
						   myWidget.initTagger();
                       } else {
                           widget.body.innerHTML += "<p>Error in WebService Response</p>";
                           widget.body.innerHTML += "<p>" + JSON.stringify(dataResp) + "</p>";
                       }
                   },
                   onFailure: function(error) {
                       widget.body.innerHTML += "<p>Call Faillure</p>";
                       widget.body.innerHTML += "<p>" + JSON.stringify(error) + "</p>";
                   }
                });
            },
			
			initTagger: function () {
				var options = {
				  widgetId: widget.id,
				  filteringMode: "WithFilteringServices"
				};
				myWidget.taggerProxy = TagNavigatorProxy.createProxy(options);
				myWidget.setTags(myWidget.dataFull);
				myWidget.taggerProxy.addEvent("onFilterSubjectsChange", myWidget.onFilterSubjectsChange);
			},
			
			setTags: function (arrData) {
				var tags = myWidget.tagsData; //Shortcut for script

				tags = {}; //Clear

				for (var i = 0; i < arrData.length; i++) {
				  var objData = arrData[i];
				  var uId = objData.physicalid;
				  tags[uId] = [];
				  tags[uId].push({
					object: objData.type,
					sixw: "ds6w:who/Type",
					dispValue: objData.type
				  });
				  tags[uId].push({
					object: objData.name,
					sixw: "ds6w:who/Name",
					dispValue: objData.name
				  });
				  tags[uId].push({
					object: objData.current,
					sixw: "ds6w:who/Current",
					dispValue: objData.current
				  });
				}

				myWidget.taggerProxy.setSubjectsTags(tags);
			},
			
			onFilterSubjectsChange: function (eventFilter) {
				var arrResult = [];
				var arrSubjects = eventFilter.filteredSubjectList;

				for (var i = 0; i < myWidget.dataFull.length; i++) {
				  var objData = myWidget.dataFull[i];

				  if (arrSubjects.indexOf(objData.physicalid) !== -1) {
					//It's one of the selected subject
					arrResult.push(objData);
				  }
				}

				if (arrResult.length === 0 && eventFilter.allfilters.length <= 0) {
				  //No result and no filters applied : Filters are probably cleared !
				  arrResult = myWidget.dataFull;   
				}

				myWidget.dataTags = arrResult;
				myWidget.displayData(arrResult);
			},
			
			clicOnRow: function(ev) {
                var elem = this;
                var objidClicked = elem.id;
				
				selected= $(elem).attr("rowSelected");
				var wasSelected = selected === "true" ? true : false;
								
				myWidget.selectUserRow(elem, wasSelected);
				
                PlatformAPI.publish(myWidget.topicName,
				{
					physicalid: objidClicked,
					secondClick: wasSelected
				});				
            },
			
			selectUserRow: function (rowElem, secondClick) {
				//Callback function called when the event happen, is published by any other widget of the dashboard, or our widget itself
				if (secondClick) {
                    //remove the color;
                    $(rowElem).css("background-color", "");
                    $(rowElem).attr("rowSelected", "false");
                } else {
                    //set the color
					$("table > tbody > tr").each(function () {
						var currentRow = this;
						$(currentRow).css("background-color", "");		
						$(currentRow).attr("rowSelected", "false");		
					});
                    $(rowElem).css("background-color", "#79D1FB");
                    $(rowElem).attr("rowSelected", "true");
                }
			},
			
			dragZone: function (elemHtml) {
				var row = elemHtml[0];
				var data3DXContent = {
				  "protocol": "3DXContent",
				  "widgetId": widget.id,
				  data: {
					items: [{
					  "objId": row.id,
					  "name": row.name,
					  "type": row.type,
					  "revision": row.revision
					}]
				  }
				};
				DataDragAndDrop.draggable(row, {
				  data: JSON.stringify(data3DXContent),
				  start: function () {
					console.log('start drag');
					var dataDnD = JSON.parse(this.data);
					var objectId = dataDnD.data.items[0].objId;
					
				  }
				});
			}
        };

        widget.addEvent("onLoad", myWidget.onLoadWidget);
        widget.addEvent("onRefresh", myWidget.onLoadWidget);
        widget.addEvent("onSearch", myWidget.onSearchWidget);
        widget.addEvent("onResetSearch", myWidget.onResetSearchWidget);
    });
}
