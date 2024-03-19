document.addEventListener('DOMContentLoaded', function() {

    /**************/
    /* DISCLOSURE */
    /**************/
  
    // Sélectionner tous les éléments avec la classe "disclosure-container"
    const disclosureContainers = document.querySelectorAll('.disclosure-container');
  
    // Parcourir les éléments sélectionnés
    disclosureContainers.forEach(container => {
      // Ajouter l'attribut aria-hidden="true" à chaque élément
      container.setAttribute('aria-hidden', 'true');
    });
  
    const buttons = document.querySelectorAll('.disclosure-trigger');
    buttons.forEach(button => {
  
      button.addEventListener('click', function() {
  
        let container = button.nextElementSibling;
        // Vérifier si le bouton est dans un parent
        if (container === null) {
          parent = button.parentElement;
          container = parent.nextElementSibling;
        } 
        if (container !== null) {
          container.classList.add('toto');
        }
  
        // Vérifier si le bouton est actuellement "ouvert" ou "fermé"
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
  
        // Inverser la valeur de aria-expanded
        this.setAttribute('aria-expanded', !isExpanded);
  
        // Si le bouton est "ouvert", révéler le div.error-list en supprimant l'attribut aria-hidden
        if (!isExpanded) {
          container.removeAttribute('aria-hidden');
        } else {
          // Si le bouton est "fermé", masquer le div.error-list en ajoutant l'attribut aria-hidden
          container.setAttribute('aria-hidden', 'true');
        }
      });
    });
  
    /*************/
    /* HIGHCHART */
    /*************/
  
    // Récupérer le titre du graphique à partir de l'élément <caption> du tableau
    const chartTitle = document.querySelector('caption').textContent;
  
    // Récupérer les données du tableau HTML
    const tableRows = document.querySelectorAll('tbody tr');
    const data = [];
    const dates = []; // Nouveau tableau pour stocker les dates
  
    tableRows.forEach((row, rowIndex) => {
      const rowData = [];
      const dateCell = row.querySelector('th');
      if (dateCell) {
        dates.push(dateCell.textContent); // Ajouter la date au tableau des dates
      }
      row.querySelectorAll('td').forEach((cell, cellIndex) => {
        rowData.push(parseInt(cell.textContent));
      });
      data.push(rowData);
    });
  
    // Récupérer les noms des séries à partir de la première ligne d'en-têtes
    const headerRow = document.querySelector('thead tr');
    const seriesNames = [];
    headerRow.querySelectorAll('th').forEach((cell, index) => {
      if (index !== 0) {
        seriesNames.push(cell.textContent);
      }
    });
  
    // Générer le graphique avec Highcharts.js
    Highcharts.chart('container', {
      chart: {
        type: 'line'
      },
      title: {
        text: chartTitle // Utiliser le titre récupéré
      },
      xAxis: {
        categories: dates // Utiliser les dates récupérées
      },
      yAxis: {
        title: {
          text: 'Erreurs axe-core'
        }
      },
      series: seriesNames.map((name, index) => ({
        name: name,
        data: data.map(row => row[index])
      }))
    });
  
  });