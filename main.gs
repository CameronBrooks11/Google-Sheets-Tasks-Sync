/* Settings */
TIMEZONE = 'America/New_York';
NUM_CATEGORIES = 10;
COLUMN_LENGTH = 96;
blockCols = 6;

// Links to spreadsheet 
var ss = SpreadsheetApp.getActiveSpreadsheet();

function onOpen() {
  createMenu();
}

function pullWeek() {
  pullTasks(7);
}
function pushWeek() {
  pushTasks(7);
}
function pullTwoWeeks() {
  pullTasks(14);
}
function pushTwoWeeks() {
  pushTasks(14);
}
function pullMonth() {
  pullTasks(30);
}
function pushMonth() {
  pushTasks(30);
}
function archiveTasks() {
  archiveCompletedTasks();
}
function sortTasks() {
  sortTasksByDate()
}

function createMenu() { 
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Calendar')
    .addItem('Pull Week', 'pullWeek')
    .addItem('Push Week', 'pushWeek')
    .addItem('Pull Two Weeks', 'pullTwoWeeks')
    .addItem('Push Two Weeks', 'pushTwoWeeks')
    .addItem('Pull Month', 'pullMonth')
    .addItem('Push Month', 'pushMonth')
    .addSeparator()
    .addItem('Archive Old Tasks', 'archiveTasks')
    .addToUi();
}

function pullTasks(days) {
  try {
    Logger.log('Pulling tasks for the next ' + days + ' days.');

    var today = new Date();
    var daysAgo = new Date();
    daysAgo.setDate(today.getDate() - 3); // Set to 3 days ago

    today.setHours(0, 0, 0, 0); // Start of the current day
    
    var timeMax = new Date(today.getTime() + days * 24 * 3600000); // End date

    for (var catInd = 0; catInd < NUM_CATEGORIES; catInd++) {
      var categoryName = getCatName(catInd);
      var listId = getOrCreateTaskList(categoryName);
      Logger.log("List ID: " + listId)
      var tasks = getTasksFromGoogleTasks(listId);

      tasks.forEach(function(task) {
        Logger.log('Task Name: ' + task.title + ', Due Date: ' + task.due + ', Status: ' + task.status + ', Notes: ' + task.notes);
        var taskDate;
        if (task.due) {
          // Create a Date object from the task due date (UTC)
          taskDate = new Date(task.due);

          // Adjust for time zone
          var timeZoneOffset = (new Date()).getTimezoneOffset() * 60000; // Timezone offset in milliseconds
          taskDate = new Date(taskDate.getTime() + timeZoneOffset);
          } else {
            taskDate = new Date();
          }
        if (taskDate >= daysAgo && taskDate < timeMax) {
          var taskName = task.title;
          var taskDesc = task.notes || '';
          var taskStatus;

          // Find the task in the spreadsheet to get the current status
          var taskData = findTaskByName(catInd, taskName);
          if (taskData) {
            // Task found in the spreadsheet
            var currentStatus = taskData.task.status; // Get the current status from the task data
            Logger.log("current status: " + currentStatus);
            Logger.log("task.status: " + task.status + ", task.title: " + task.title);

            if (task.status === 'completed') {
              taskStatus = 'Complete';
            } else if (!currentStatus || currentStatus === '') {
              taskStatus = 'Not Started'; // Set default if current status is blank
            } else if (currentStatus === 'Complete' || task.status === 'needsAction') {
              taskStatus = 'Not Started'; // Set default if current status is blank
            } else {
              taskStatus = currentStatus; // Retain current status
            }
          } else {
            // Task not found, it's a new task
            taskStatus = (task.status === 'completed') ? 'Complete' : 'Not Started';
          }
          updateOrAddTask(catInd, taskName, Utilities.formatDate(taskDate, TIMEZONE, 'MMMM d, y'), taskDesc, taskStatus);
        }
      });
    }

    Logger.log('Tasks pulled from Google Tasks and updated in the spreadsheet.');
  } catch (e) {
    Logger.log('Error occurred: ' + e.toString());
    SpreadsheetApp.getUi().alert('Error: ' + e.message + '. Please check your data validation rules and try again.');
    return;
  }
}


function pushTasks(days) {
  Logger.log('Pushing tasks for the next ' + days + ' days.');

  var today = new Date();
  today.setHours(0, 0, 0, 0); // Start of the current day
  var timeMax = new Date(today.getTime() + days * 24 * 3600000); // End time

  var daysAgo = new Date();
  daysAgo.setDate(today.getDate() - 14); // Set to 14 days ago

  for (var i = 0; i < NUM_CATEGORIES; i++) {
    var catName = getCatName(i);
    var listId = getOrCreateTaskList(catName);

    for (var j = 0; j < COLUMN_LENGTH; j++) {
      var task = getTask(i, j);
      if (task && task.date >= daysAgo && task.date < timeMax) {
        Logger.log('Preparing to add task: ' + JSON.stringify(task));
        addTaskToGoogleTasks(task, listId);
      }
    }
  }
}
