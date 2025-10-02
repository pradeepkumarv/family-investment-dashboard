function exportReport(format, category) {
    if (format === 'pdf') exportToPDF(category);
    else if (format === 'csv') exportToCSV(category);  
    else if (format === 'json') exportToJSON(category);
}
