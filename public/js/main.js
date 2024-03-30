document.addEventListener('DOMContentLoaded', function() {
  

  /**************/
  /* DISCLOSURE */
  /**************/

  // Select all elements with the "disclosure-container" class
  const disclosureContainers = document.querySelectorAll('.disclosure-container');

  // Browse selected items
  disclosureContainers.forEach(container => {
    // Add the aria-hidden="true" attribute to each element
    container.setAttribute('aria-hidden', 'true');
  });

  const buttons = document.querySelectorAll('.disclosure-trigger');
  buttons.forEach(button => {

    button.addEventListener('click', function() {

      let container = button.nextElementSibling;
      
      // Check if the button is in a parent
      if (container === null) {
        parent = button.parentElement;
        container = parent.nextElementSibling;
      } 

      // Check whether the button is currently "open" or "closed"
      const isExpanded = this.getAttribute('aria-expanded') === 'true';

      // Invert the value of aria-expanded
      this.setAttribute('aria-expanded', !isExpanded);

      // If the button is "open", reveal the div.error-list by removing the aria-hidden attribute
      if (!isExpanded) {
        container.removeAttribute('aria-hidden');
      } else {
        // If the button is "closed", hide the div.error-list by adding the aria-hidden attribute
        container.setAttribute('aria-hidden', 'true');
      }
    });
  });


  /*************/
  /* HIGHCHART */
  /*************/

  // Fetching data from the HTML table
  const tableRows = document.querySelectorAll('tbody tr');
  const data = [];
  const dates = []; // New table for storing dates

  tableRows.forEach((row, rowIndex) => {
    const rowData = [];
    const dateCell = row.querySelector('th');
    if (dateCell) {
      dates.push(dateCell.textContent); // Add date to date table
    }
    row.querySelectorAll('td').forEach((cell, cellIndex) => {
      rowData.push(parseInt(cell.textContent));
    });
    data.push(rowData);
  });

  // Fetch series names from the first line of headers
  const headerRow = document.querySelector('thead tr');
  const seriesNames = [];
  headerRow.querySelectorAll('th').forEach((cell, index) => {
    if (index !== 0) {
      seriesNames.push(cell.textContent);
    }
  });

  // Generate the chart with Highcharts.js
  Highcharts.chart('container', {
    chart: {
      type: 'line'
    },
    title: {
      text: null
    },
    xAxis: {
      categories: dates // Use retrieved dates
    },
    yAxis: {
      title: {
        text: document.getElementById('container').getAttribute('data-yAxisTitle')
      }
    },
    series: seriesNames.map((name, index) => ({
      name: name,
      data: data.map(row => row[index])
    }))
  });

});