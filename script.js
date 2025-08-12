// script.js - logic for index.html (Project Planner)

(() => {
  const STORAGE_KEY = 'mgcp_projects_v2';
  let projects = [];
  let teams = [
    { id: 'gypsum', name: 'Gypsum Team', color: getComputedStyle(document.documentElement).getPropertyValue('--team-gypsum').trim() || '#1abc9c' },
    { id: 'paint', name: 'Gypsum Paint Team', color: getComputedStyle(document.documentElement).getPropertyValue('--team-paint').trim() || '#f39c12' },
    { id: 'ac', name: 'AC Team', color: getComputedStyle(document.documentElement).getPropertyValue('--team-ac').trim() || '#3498db' },
    { id: 'wiring', name: 'Wiring Team', color: getComputedStyle(document.documentElement).getPropertyValue('--team-wiring').trim() || '#9b59b6' },
    { id: 'plumbing', name: 'Plumbing Team', color: getComputedStyle(document.documentElement).getPropertyValue('--team-plumbing').trim() || '#e67e22' },
    { id: 'other', name: 'Other', color: getComputedStyle(document.documentElement).getPropertyValue('--team-other').trim() || '#7f8c8d' }
  ];

  // UI Elements
  const projectSelect = document.getElementById('project-select');
  const btnNewProject = document.getElementById('btn-new-project');
  const btnDeleteProject = document.getElementById('btn-delete-project');
  const areasContainer = document.getElementById('areas-container');
  const btnAddArea = document.getElementById('btn-add-area');
  const btnDownload = document.getElementById('btn-download');
  const btnGanttView = document.getElementById('btn-gantt-view');
  const btnLegendView = document.getElementById('btn-legend-view');
  const legendContainer = document.getElementById('legend-container');
  const teamLegendList = document.getElementById('team-legend-list');
  const btnAddTeam = document.getElementById('btn-add-team');

  let currentProjectId = null;
  let debounceSave = debounce(saveData, 500);

  // --- Initialization ---

  function init() {
    loadData();
    if (!projects.length) {
      createDefaultProject();
    }
    currentProjectId = projects[0].id;
    renderProjectSelect();
    renderCurrentProject();
    renderLegend();
    bindEvents();
    updateView('gantt');
  }

  // Load projects & teams from localStorage
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        projects = JSON.parse(stored);
      } else {
        projects = [];
      }
    } catch {
      projects = [];
    }
    // Try to load teams colors and names from localStorage (legend)
    const storedTeams = localStorage.getItem('mgcp_teams');
    if (storedTeams) {
      try {
        const parsed = JSON.parse(storedTeams);
        if (Array.isArray(parsed)) {
          // Validate & assign teams
          teams = parsed.filter(t => t.id && t.name && t.color);
        }
      } catch {}
    }
  }

  // Save projects and teams to localStorage
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem('mgcp_teams', JSON.stringify(teams));
  }

  // Create a default project to start
  function createDefaultProject() {
    const defaultProject = {
      id: generateUUID(),
      name: 'Default Project',
      areas: [
        {
          id: generateUUID(),
          name: 'Main Area',
          tasks: [
            {
              id: generateUUID(),
              team: 'gypsum',
              startDate: formatDateDMY(new Date()),
              endDate: formatDateDMY(new Date()),
              notes: '',
              completed: false,
            },
          ],
        },
      ],
    };
    projects.push(defaultProject);
    saveData();
  }

  // --- Rendering ---

  // Render project select dropdown
  function renderProjectSelect() {
    projectSelect.innerHTML = '';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === currentProjectId) opt.selected = true;
      projectSelect.appendChild(opt);
    });
  }

  // Render current project's areas and tasks
  function renderCurrentProject() {
    areasContainer.innerHTML = '';
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    project.areas.forEach(area => {
      const areaDiv = document.createElement('div');
      areaDiv.className = 'area';
      areaDiv.dataset.areaId = area.id;

      // Area header
      const header = document.createElement('div');
      header.className = 'area-header';

      const areaNameInput = document.createElement('input');
      areaNameInput.type = 'text';
      areaNameInput.className = 'area-name';
      areaNameInput.value = area.name;
      areaNameInput.placeholder = 'Area Name';
      areaNameInput.addEventListener('input', () => {
        area.name = areaNameInput.value.trim();
        debounceSave();
      });

      const btnDeleteArea = document.createElement('button');
      btnDeleteArea.textContent = 'Delete Area';
      btnDeleteArea.className = 'btn-danger';
      btnDeleteArea.addEventListener('click', () => {
        if (confirm(`Delete area "${area.name}"?`)) {
          deleteArea(area.id);
        }
      });

      header.appendChild(areaNameInput);
      header.appendChild(btnDeleteArea);
      areaDiv.appendChild(header);

      // Tasks table
      const table = document.createElement('table');
      table.className = 'task-list';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Team</th>
          <th>Start Date</th>
          <th>End Date</th>
          <th>Notes</th>
          <th>Completed</th>
          <th>Delete</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');

      area.tasks.forEach(task => {
        const tr = createTaskRow(area, task);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      areaDiv.appendChild(table);

      // Add New Task button
      const btnAddTask = document.createElement('button');
      btnAddTask.textContent = 'Add New Task';
      btnAddTask.className = 'btn-secondary';
      btnAddTask.addEventListener('click', () => {
        addTaskToArea(area.id);
      });
      areaDiv.appendChild(btnAddTask);

      areasContainer.appendChild(areaDiv);
    });
  }

  // Create a task table row for a given task object
  function createTaskRow(area, task) {
    const tr = document.createElement('tr');
    tr.dataset.taskId = task.id;

    // Team select with "Other" editable
    const tdTeam = document.createElement('td');
    const selectTeam = document.createElement('select');

    teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      if (team.id === task.team) opt.selected = true;
      selectTeam.appendChild(opt);
    });

    const otherTeamInput = document.createElement('input');
    otherTeamInput.type = 'text';
    otherTeamInput.placeholder = 'Enter custom team name';
    otherTeamInput.className = 'other-team-input hidden';

    function updateTeamSelection() {
      if (selectTeam.value === 'other') {
        otherTeamInput.classList.remove('hidden');
        if (task.teamNameCustom) otherTeamInput.value = task.teamNameCustom;
        else otherTeamInput.value = '';
      } else {
        otherTeamInput.classList.add('hidden');
        task.teamNameCustom = '';
      }
    }

    selectTeam.addEventListener('change', () => {
      if (selectTeam.value === 'other') {
        task.team = 'other';
        updateTeamSelection();
      } else {
        task.team = selectTeam.value;
        task.teamNameCustom = '';
        updateTeamSelection();
      }
      debounceSave();
      renderLegend(); // Update legend if needed
    });

    otherTeamInput.addEventListener('input', () => {
      task.teamNameCustom = otherTeamInput.value.trim();
      debounceSave();
      renderLegend();
    });

    updateTeamSelection();

    tdTeam.appendChild(selectTeam);
    tdTeam.appendChild(otherTeamInput);
    tr.appendChild(tdTeam);

    // Start Date input (type=date), displayed and edited as yyyy-mm-dd but shown dd/mm/yyyy on blur/focusout
    const tdStart = document.createElement('td');
    const inputStart = document.createElement('input');
    inputStart.type = 'date';
    inputStart.value = formatDateISO(task.startDate);
    inputStart.addEventListener('change', () => {
      task.startDate = formatDateDMY(new Date(inputStart.value));
      debounceSave();
    });
    tdStart.appendChild(inputStart);
    tr.appendChild(tdStart);

    // End Date input
    const tdEnd = document.createElement('td');
    const inputEnd = document.createElement('input');
    inputEnd.type = 'date';
    inputEnd.value = formatDateISO(task.endDate);
    inputEnd.addEventListener('change', () => {
      task.endDate = formatDateDMY(new Date(inputEnd.value));
      debounceSave();
    });
    tdEnd.appendChild(inputEnd);
    tr.appendChild(tdEnd);

    // Notes input
    const tdNotes = document.createElement('td');
    const inputNotes = document.createElement('input');
    inputNotes.type = 'text';
    inputNotes.placeholder = 'Optional notes';
    inputNotes.value = task.notes || '';
    inputNotes.addEventListener('input', () => {
      task.notes = inputNotes.value;
      debounceSave();
    });
    tdNotes.appendChild(inputNotes);
    tr.appendChild(tdNotes);

    // Completed checkbox
    const tdCompleted = document.createElement('td');
    const inputCompleted = document.createElement('input');
    inputCompleted.type = 'checkbox';
    inputCompleted.checked = !!task.completed;
    inputCompleted.addEventListener('change', () => {
      task.completed = inputCompleted.checked;
      debounceSave();
    });
    tdCompleted.appendChild(inputCompleted);
    tr.appendChild(tdCompleted);

    // Delete task button
    const tdDelete = document.createElement('td');
    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Delete';
    btnDelete.className = 'delete-task btn-danger';
    btnDelete.addEventListener('click', () => {
      if (confirm('Delete this task?')) {
        deleteTask(area.id, task.id);
      }
    });
    tdDelete.appendChild(btnDelete);
    tr.appendChild(tdDelete);

    return tr;
  }

  // Convert dd/mm/yyyy to yyyy-mm-dd for input[type=date] value
  function formatDateISO(dmy) {
    const d = parseDateDMY(dmy);
    if (!d) return '';
    return d.toISOString().slice(0, 10);
  }

  // Add new project
  btnNewProject.addEventListener('click', () => {
    const name = prompt('Enter new project name:');
    if (name && name.trim()) {
      const newProject = {
        id: generateUUID(),
        name: name.trim(),
        areas: [],
      };
      projects.push(newProject);
      currentProjectId = newProject.id;
      saveData();
      renderProjectSelect();
      renderCurrentProject();
    }
  });

  // Delete selected project
  btnDeleteProject.addEventListener('click', () => {
    if (!currentProjectId) return;
    if (confirm('Are you sure you want to delete this project?')) {
      projects = projects.filter(p => p.id !== currentProjectId);
      if (projects.length) currentProjectId = projects[0].id;
      else {
        createDefaultProject();
        currentProjectId = projects[0].id;
      }
      saveData();
      renderProjectSelect();
      renderCurrentProject();
    }
  });

  // On project selection change
  projectSelect.addEventListener('change', e => {
    currentProjectId = e.target.value;
    renderCurrentProject();
  });

  // Add new area button
  btnAddArea.addEventListener('click', () => {
    if (!currentProjectId) return;
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;
    const areaName = prompt('Enter area name:');
    if (!areaName || !areaName.trim()) return;
    const newArea = {
      id: generateUUID(),
      name: areaName.trim(),
      tasks: [],
    };
    project.areas.push(newArea);
    saveData();
    renderCurrentProject();
  });

  // Add task to area
  function addTaskToArea(areaId) {
    if (!currentProjectId) return;
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;
    const area = project.areas.find(a => a.id === areaId);
    if (!area) return;
    const newTask = {
      id: generateUUID(),
      team: 'gypsum',
      startDate: formatDateDMY(new Date()),
      endDate: formatDateDMY(new Date()),
      notes: '',
      completed: false,
      teamNameCustom: '',
    };
    area.tasks.push(newTask);
    saveData();
    renderCurrentProject();
  }

  // Delete area
  function deleteArea(areaId) {
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;
    project.areas = project.areas.filter(a => a.id !== areaId);
    saveData();
    renderCurrentProject();
  }

  // Delete task
  function deleteTask(areaId, taskId) {
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;
    const area = project.areas.find(a => a.id === areaId);
    if (!area) return;
    area.tasks = area.tasks.filter(t => t.id !== taskId);
    saveData();
    renderCurrentProject();
  }

  // Render legend view with color pickers and editable team names
  function renderLegend() {
    teamLegendList.innerHTML = '';
    teams.forEach((team, idx) => {
      const li = document.createElement('li');

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = team.color;
      colorInput.title = 'Pick team color';
      colorInput.addEventListener('input', () => {
        team.color = colorInput.value;
        saveData();
        renderCurrentProject();
      });

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = team.name;
      nameInput.placeholder = 'Team Name';
      nameInput.addEventListener('input', () => {
        team.name = nameInput.value.trim();
        saveData();
        renderCurrentProject();
        renderProjectSelect();
      });

      const btnDeleteTeam = document.createElement('button');
      btnDeleteTeam.textContent = 'Delete';
      btnDeleteTeam.className = 'delete-team btn-danger';
      btnDeleteTeam.disabled = team.id === 'gypsum' || team.id === 'paint';
      btnDeleteTeam.title = btnDeleteTeam.disabled ? 'Default team cannot be deleted' : 'Delete team';
      btnDeleteTeam.addEventListener('click', () => {
        if (confirm(`Delete team "${team.name}"? This will reset tasks with this team to "Other".`)) {
          deleteTeam(team.id);
        }
      });

      li.appendChild(colorInput);
      li.appendChild(nameInput);
      li.appendChild(btnDeleteTeam);

      teamLegendList.appendChild(li);
    });
  }

  // Add new team button
  btnAddTeam.addEventListener('click', () => {
    const name = prompt('Enter new team name:');
    if (!name || !name.trim()) return;
    const id = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (teams.some(t => t.id === id)) {
      alert('Team with this name already exists.');
      return;
    }
    const color = getRandomColor();
    teams.push({ id, name: name.trim(), color });
    saveData();
    renderLegend();
    renderCurrentProject();
  });

  // Delete team and reassign affected tasks to "other"
  function deleteTeam(teamId) {
    teams = teams.filter(t => t.id !== teamId);
    projects.forEach(p => {
      p.areas.forEach(a => {
        a.tasks.forEach(t => {
          if (t.team === teamId) {
            t.team = 'other';
            t.teamNameCustom = '';
          }
        });
      });
    });
    saveData();
    renderLegend();
    renderCurrentProject();
  }

  // Switch view buttons (Gantt or Legend)
  btnGanttView.addEventListener('click', () => updateView('gantt'));
  btnLegendView.addEventListener('click', () => updateView('legend'));

  function updateView(view) {
    if (view === 'gantt') {
      areasContainer.style.display = 'block';
      btnAddArea.style.display = 'inline-block';
      legendContainer.classList.add('hidden');
      btnGanttView.classList.add('active');
      btnLegendView.classList.remove('active');
    } else if (view === 'legend') {
      areasContainer.style.display = 'none';
      btnAddArea.style.display = 'none';
      legendContainer.classList.remove('hidden');
      btnGanttView.classList.remove('active');
      btnLegendView.classList.add('active');
    }
  }

  // Download page as PNG
  btnDownload.addEventListener('click', () => {
    downloadPageAsImage('ModernGypsumPlanner.png');
  });

  // Helpers

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
  }

  // Utility function from utils.js (assumes utils.js loaded before)
  // generateUUID, parseDateDMY, formatDateDMY, debounce, downloadPageAsImage

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
