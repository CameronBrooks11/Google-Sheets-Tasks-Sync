function archiveCompletedTasks() {
  var today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of the current day

  var threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3); // Set to three days ago

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var activeSheet = ss.getActiveSheet();
  var activeSheetName = activeSheet.getName();
  var archiveSheetName = activeSheetName + "Archive";
  var archiveSheet = ss.getSheetByName(archiveSheetName);

  for (var catInd = 0; catInd < NUM_CATEGORIES; catInd++) {
    for (var rowInd = 0; rowInd < COLUMN_LENGTH; rowInd++) {
      var task = getTask(catInd, rowInd);
      if (task && task.status === 'Complete' && new Date(task.date) < threeDaysAgo) {
        // Move task to Archive
        moveToArchive(task, archiveSheet, catInd);
        // Clear the row in the Main sheet
        clearRow(activeSheet, catInd, rowInd);
      }
    }
  }
}

function moveToArchive(task, archiveSheet, catInd) {
  // Find the first empty row in the Archive sheet
  for (var rowInd = 0; rowInd < COLUMN_LENGTH; rowInd++) {
    if (readCell(archiveSheet.getName(), rowInd + 4, catInd * (blockCols + 1) + 11) === '') {
      // Assuming the Archive sheet has the same structure as Main
      var startCol = catInd * (blockCols + 1) + 11;
      archiveSheet.getRange(rowInd + 4, startCol, 1, blockCols).setValues([
        [task.date, task.name, task.desc, task.person, task.priority, task.status]
      ]);
      break;
    }
  }
}

function clearRow(sheet, catInd, rowInd) {
  var startCol = catInd * (blockCols + 1) + 11;
  var range = sheet.getRange(rowInd + 4, startCol, 1, blockCols + 1);
  range.clearContent();
}
