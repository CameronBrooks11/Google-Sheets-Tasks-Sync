// Returns the value of a cell ex. (1, 2) reads the value of cell B1
function readCell(ssName, row, col) {
  return ss.getSheetByName(ssName).getRange(row, col).getValue();
}

// Sets the value of a cell ex. (1, 2) sets the value of cell B1
function setCell(ssName, row, col, value) {
  ss.getSheetByName(ssName).getRange(row, col).setValue(value);
}

//Generate an id value for a task
function genId(catInd, rowInd) {
  var id = 'SCS';
  
  if (catInd < 10) {
    id += '0';
  }

  id += catInd.toString();

  if (rowInd < 10) {
    id += '0';
  }

  id += rowInd.toString();

  return id;
}

function isSameDay(date1, date2) {
  var d1 = new Date(date1);
  var d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function findCategoryIndex(categoryName) {
  NUM_CATEGORIES = 10;
  for (var catInd = 0; catInd < NUM_CATEGORIES; catInd++) {
    if (getCatName(catInd) === categoryName) {
      return catInd;
    }
  }
  return -1; // Return -1 if category is not found
}

function findTaskByName(catInd, taskName) {
  for (var rowInd = 0; rowInd < COLUMN_LENGTH; rowInd++) {
    var task = getTask(catInd, rowInd);
    if (task && task.name === taskName) {
      return { task: task, rowInd: rowInd };
    }
  }
  return null; // Return null if task is not found
}
