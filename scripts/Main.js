function executeWidgetCode() {
	require([], function() {
		var myWidget = {
			onLoad: function() {
				widget.body.innerHTML =
					"<h2>Widget loaded from GitHub Pages</h2>" +
					"<p>HTML, CSS and JavaScript are loading correctly.</p>";
			}
		};

		widget.addEvent("onLoad", myWidget.onLoad);
	});

	// Original droppable test version. Restore this block when the basic loading
	// test works inside 3DEXPERIENCE.
	//
	// require(["DS/DataDragAndDrop/DataDragAndDrop"], function(DataDragAndDrop) {
	// 	var myWidget = {
	// 		dataFull: [],
	// 		displayData: function(arrData) {
	// 			var tableHTML = "<table><thead><tr><th>First Name</th><th>Last Name</th><th>userId</th></tr></thead><tbody>";
	//
	// 			for (var i = 0; i < arrData.length; i++) {
	// 				tableHTML = tableHTML + "<tr>" + arrData[i] + "</tr>";
	// 			}
	//
	// 			tableHTML += "</tbody></table>";
	// 			widget.body.innerHTML = tableHTML;
	// 		},
	//
	// 		onLoad: function() {
	// 			var dropElement = widget.body;
	//
	// 			DataDragAndDrop.droppable(dropElement, {
	// 				drop: function(data) {
	// 					var arrayData = [];
	// 					arrayData.push(data);
	// 					myWidget.displayData(arrayData);
	// 					widget.body.style = "border:5px hidden;";
	// 				},
	// 				enter: function() {
	// 					console.log("Enter");
	// 					widget.body.style = "border:5px solid orange;";
	// 				},
	// 				leave: function() {
	// 					console.log("Leave");
	// 					widget.body.style = "border:5px solid red;";
	// 				},
	// 				over: function() {
	// 					console.log("Over");
	// 					widget.body.style = "border:5px solid orange;";
	// 				}
	// 			});
	// 		}
	// 	};
	//
	// 	widget.addEvent("onLoad", myWidget.onLoad);
	// });
}
