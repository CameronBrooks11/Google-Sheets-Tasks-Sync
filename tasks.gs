function getTasksFromGoogleTasks(listId) {
  var allTasks = [];
  var optionalArgs = {
    showCompleted: true, // Include completed tasks
    showHidden: true, // Include tasks completed in first-party clients
    maxResults: 100 // Adjust based on your needs
  };
  var response;
  
  do {
    // If there's a nextPageToken, add it to the optionalArgs
    if (response && response.nextPageToken) {
      optionalArgs.pageToken = response.nextPageToken;
    }
    
    try {
      response = Tasks.Tasks.list(listId, optionalArgs);
      var tasks = response.items;
      if (tasks && tasks.length > 0) {
        for (var i = 0; i < tasks.length; i++) {
          var task = tasks[i];
          allTasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            due: task.due ? new Date(task.due) : 'No due date',
            completed: task.completed ? new Date(task.completed) : 'Not completed'
          });
        }
      } else {
        Logger.log('No more tasks found.');
        break; // Exit the loop if no more tasks are found
      }
    } catch (error) {
      Logger.log('An error occurred: ' + error);
      break; // Exit the loop if an error occurs
    }
  } while (response.nextPageToken); // Continue until there are no more pages of tasks
  
  return allTasks;
}


// Get the task list if it exists, if not create it first
function getOrCreateTaskList(listName) {
  var taskListsUrl = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
  var taskListOptions = {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  };

  // Check if the list already exists
  var listsResponse = UrlFetchApp.fetch(taskListsUrl, taskListOptions);
  var lists = JSON.parse(listsResponse.getContentText()).items || [];
  for (var i = 0; i < lists.length; i++) {
    if (lists[i].title === listName) {
      return lists[i].id; // Return existing list ID
    }
  }

  // Create new list if not found
  var newListPayload = JSON.stringify({ title: listName });
  var createListOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: newListPayload
  };

  var newListResponse = UrlFetchApp.fetch(taskListsUrl, createListOptions);
  var newList = JSON.parse(newListResponse.getContentText());
  return newList.id; // Return new list ID
}

// Get category name from index 
function getCatName(catInd) {
  var col = (blockCols + 1) * catInd + 11; // Starting from column K (11 in zero-based index)
  var row = 2;
  
  return readCell('Main', row, col);
}

// Get task from spreadsheet 
function getTask(catInd, rowInd) {
  var col = (blockCols + 1) * catInd + 11; // Starting from column K (11 in zero-based index)
  var row = rowInd + 4; // Adjusting to the new row start index
  
  if (readCell('Main', row, col) === '') {
    return null;
  }
  
  var taskInfo = {
    date: new Date(Utilities.formatDate(readCell('Main', row, col), TIMEZONE, 'MMMM d, y')),
    name: readCell('Main', row, col + 1),
    desc : readCell('Main', row, col + 2),
    person : readCell('Main', row, col + 3),
    priority: readCell('Main', row, col + 4),
    status: readCell('Main', row, col + 5)
  }
  taskInfo.id = genId(catInd, rowInd);
  //taskInfo.desc =  taskInfo.id + " : " + taskInfo.desc;
  Logger.log('Returning taskInfo (date,name,desc,person,status): ' + taskInfo.date.toString() + ',' + taskInfo.name + ',' + taskInfo.desc + ',' + taskInfo.person + ',' + taskInfo.status);
  return taskInfo;
}


function isDuplicateTask(taskName, listId) {
  var tasks = getTasksFromGoogleTasks(listId);

  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].title === taskName) {
      Logger.log('Found duplicate task: ' + taskName);
      return tasks[i]; // Return the found task
    }
  }
  Logger.log('Found NON-duplicate task: ' + taskName);
  return null; // No task found
}

function isValidTask(task) {
  if (!task || !task.date) {
    return false; // Task is not valid if it doesn't exist or has no date
  }
  
  var date = new Date(task.date);
  return !isNaN(date.getTime()); // Check if date is valid
}

// Add task to Google Tasks
function addTaskToGoogleTasks(taskInfo, listId) {
  Logger.log('Checking if duplicate...' + taskInfo.name + listId)
  var googleTask = isDuplicateTask(taskInfo.name, listId);

  if (googleTask) {
    
    // Check if the dates differ (ignoring time)
    if (!isSameDay(googleTask.due, taskInfo.date)) {
      updateGoogleTaskDate(googleTask.id, taskInfo.date, listId);
    }
    updateTaskStatusIfNeeded(taskInfo, googleTask, listId);
    return;
  }

  var tasksApiUrl = 'https://tasks.googleapis.com/tasks/v1/lists/' + listId + '/tasks';
  var payload = {
    title: taskInfo.name,
    notes: taskInfo.desc || "",
    due: taskInfo.date.toISOString()
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload)
  };

  try {
    var response = UrlFetchApp.fetch(tasksApiUrl, options);
    var result = JSON.parse(response.getContentText());
    Logger.log('Task added to Google Tasks: ' + JSON.stringify(result));
    return result.id;
  } catch (e) {
    Logger.log('Error adding task to Google Tasks: ' + e.toString());
    return null;
  }
}


function updateOrAddTask(catInd, taskName, taskDate, taskDesc, taskStatus) {
  var taskData = findTaskByName(catInd, taskName);
  if (taskData) {
    // Task found, update it
    Logger.log('Task Found')
    var row = taskData.rowInd + 4; // Adjust row index
    setCell('Main', row, catInd * (blockCols + 1) + 11, taskDate);
    setCell('Main', row, catInd * (blockCols + 1) + 12, taskName);
    setCell('Main', row, catInd * (blockCols + 1) + 13, taskDesc);
    setCell('Main', row, catInd * (blockCols + 1) + 14, ''); // Assuming this is for 'person'
    setCell('Main', row, catInd * (blockCols + 1) + 15, ''); // Assuming this is for 'priority'
    setCell('Main', row, catInd * (blockCols + 1) + 16, taskStatus);
  } else {
      Logger.log('Task Not Found, Adding to End')
    // Task not found, add to the bottom of the list
    for (var rowInd = 0; rowInd < COLUMN_LENGTH; rowInd++) {
      if (getTask(catInd, rowInd) === null) { // Find first empty row
        var row = rowInd + 4; // Adjust row index
        setCell('Main', row, catInd * (blockCols + 1) + 11, taskDate);
        setCell('Main', row, catInd * (blockCols + 1) + 12, taskName);
        setCell('Main', row, catInd * (blockCols + 1) + 13, taskDesc);
        setCell('Main', row, catInd * (blockCols + 1) + 14, ''); // Assuming this is for 'person'
        setCell('Main', row, catInd * (blockCols + 1) + 15, ''); // Assuming this is for 'priority'
        setCell('Main', row, catInd * (blockCols + 1) + 16, taskStatus);
        break;
      }
    }
  }
  Logger.log('Task add/updated: ' + taskName + '|' + taskDate + '|' + taskDesc + '|' + taskStatus);
}


function updateTaskStatusIfNeeded(sheetTask, googleTask, listId, catInd, rowInd) {
  var isSheetTaskComplete = sheetTask.status === 'Complete';
  var isGoogleTaskComplete = googleTask.status === 'completed'; // Google Tasks uses 'completed'

  // If the task is complete in either system, update the other to match
  if (isSheetTaskComplete || isGoogleTaskComplete) {
    if (!isSheetTaskComplete) {
      // Update the spreadsheet if it's not marked as complete
      setSheetTaskToComplete(catInd, rowInd);
    }

    if (!isGoogleTaskComplete) {
      // Update Google Tasks if it's not marked as complete
      var col = (blockCols + 1) * catInd + 15; // Column for status (assuming status is in the 5th column of block)
      var ssName = 'Main'; // Replace with your actual sheet name
      setCell(ssName, rowInd, col, 'Complete');
      Logger.log('Task marked as complete in sheet: Category ' + catInd + ' Row ' + rowInd);
      }
  }

  if (!isSameDay(googleTask.due, sheetTask.date)) {
    updateGoogleTaskDate(googleTask.id, sheetTask.date, listId);
  }
}

function updateGoogleTaskDate(taskId, newDate, listId) {
  var tasksApiUrl = 'https://tasks.googleapis.com/tasks/v1/lists/' + listId + '/tasks/' + taskId;
  var payload = {
    due: newDate.toISOString()
  };
  var options = {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(tasksApiUrl, options);
    Logger.log('Task date updated in Google Tasks: ' + taskId);
  } catch (e) {
    Logger.log('Error updating task date in Google Tasks: ' + e.toString());
  }
}
