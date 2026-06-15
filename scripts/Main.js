function executeWidgetCode() {	
	require(['DS/DataDragAndDrop/DataDragAndDrop'], function(DataDragAndDrop) {
		var myWidget = {
			dataFull: [],
			displayData: function(arrData) {
					var tableHTML = "<table><thead><tr><th>First Name</th><th>Last Name</th><th>userId</th></tr></thead><tbody>";

					for (var i = 0; i < arrData.length; i++) {
						tableHTML =
							tableHTML + "<tr>"+arrData[i]+"</tr>";
					}

					tableHTML += "</tbody></table>";

					widget.body.innerHTML = tableHTML;
			},

			onLoad: function() {			
				/* var dropElement = widget.body;
				//code for drop functionality
				DataDragAndDrop.droppable(dropElement, {
					drop: function(data){
						var arrayData=[];
						arrayData.push(data);
						myWidget.displayData(arrayData);
						widget.body.style="border:5px hidden;"
					},
					enter: function(){
						console.log("Enter");
						widget.body.style="border:5px solid orange;"
					},
					leave: function(){
						console.log("Leave");
						widget.body.style="border:5px solid red;"
						
					},
					over: function(){
						console.log("Over");
						widget.body.style="border:5px solid orange;"
					} 
					
				});*/
			
				
					
			}   
		}; 			
		widget.addEvent('onLoad',  myWidget.onLoad);
	});
}