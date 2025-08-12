// dashboard.js - logic for dashboard.html (Team Activity Dashboard)

(() => {
  const STORAGE_KEY = 'mgcp_projects_v2';
  let projects = [];
  let teams = [];

  const dashboardContainer = document.getElementById('dashboard-container');
  const btnDownloadDashboard = document.getElementById('btn-download-dashboard');

  // Colors for projects (will assign dynamically)
  const projectColors = {};

  // Initialize
  function init() {
    loadData();
    filterTeams();
    assignProjectColors();
    renderDashboard();
    bindEvents();
  }

  // Load projects and teams from localStorage
  function loadData() {
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      projects = storedProjects ? JSON.parse(storedProjects) : [];
    } catch {
      projects = [];
    }
  }

  // Identify gypsum and paint related teams across all projects
  // Groups teams by normalized name (all teams that include 'gypsum' or 'paint' keywords in id or name)
  // Return an array of { id, name, tasks: [...] }
  function filterTeams() {
    // Gather all tasks from all projects by team
    const teamMap = new Map();

    projects.forEach(project => {
      project.areas.forEach(area => {
        area.tasks.forEach(task => {
          // Determine teamId and teamName (custom name if exists)
          let teamId = task.team || 'other';
          let teamName = task.teamNameCustom && task.team === 'other' ? task.teamNameCustom.toLowerCase() : teamId.toLowerCase();

          // Normalize to check if gypsum or paint related
          const isGypsum = teamId.toLowerCase().includes('gypsum') || teamName.includes('gypsum');
          const isPaint = teamId.toLowerCase().includes('paint') || teamName.includes('paint');

          if (!(isGypsum || isPaint)) return; // Skip non gypsum/paint teams

          // Use normalized teamId (or custom team name if other)
          const normalizedTeamId = isGypsum ? (teamId.toLowerCase().startsWith('gypsum') ? teamId.toLowerCase() : teamName) :
            (isPaint ? (teamId.toLowerCase().startsWith('paint') ? teamId.toLowerCase() : teamName) : teamId);

          if (!teamMap.has(normalizedTeamId)) {
            teamMap.set(normalizedTeamId, {
              id: normalizedTeamId,
              name: capitalizeWords(normalizedTeamId.replace(/[-_]/g, ' ')),
              tasks: []
            });
          }
          // Add task to the team's task list with project and area info
          teamMap.get(normalizedTeamId).tasks.push({
            ...task,
            areaName: area.name,
            projectName: project.name,
            projectId: project.id
          });
        });
      });
    });

    teams = Array.from(teamMap.values());
  }

  // Assign distinct colors to projects to differentiate tasks in dashboard calendar
  function assignProjectColors() {
    const allProjectIds = projects.map(p => p.id);
    const palette = [
      '#1abc9c', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#34495e', '#16a085', '#27ae60',
      '#2980b9', '#8e44ad', '#d35400', '#c0392b'
    ];
    projectColors.clear;
    allProjectIds.forEach((pid, idx) => {
      projectColors[pid] = palette[idx % palette.length];
    });
  }

  // Render the dashboard with combined calendars per gypsum/paint team
  function renderDashboard() {
    dashboardContainer.innerHTML = '';

    if (!teams.length) {
      dashboardContainer.textContent = 'No gypsum or paint teams/tasks found.';
      return;
    }

    teams.forEach(team => {
      const teamSection = document.createElement('section');
      teamSection.className = 'team-calendar-section';

      const title = document.createElement('h2');
      title.textContent = team.name;
      teamSection.appendChild(title);

      // Determine min and max dates across tasks for this team
      const dates = team.tasks.flatMap(t => [parseDateDMY(t.startDate), parseDateDMY(t.endDate)]).filter(d => d instanceof Date);
      if (dates.length === 0) {
        teamSection.appendChild(document.createTextNode('No scheduled tasks.'));
        dashboardContainer.appendChild(teamSection);
        return;
      }

      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      // Fixed 14-day visible window start from minDate for timeline scale
      // We'll show a 14-day timeline bar but allow horizontal scroll for entire duration
      const visibleDays = 14;
      const totalDays = diffDays(minDate, maxDate) + 1;

      // Container for timeline (horizontal scroll)
      const timelineWrapper = document.createElement('div');
      timelineWrapper.className = 'timeline-wrapper';

      // Timeline header with dates
      const timelineHeader = document.createElement('div');
      timelineHeader.className = 'timeline-header';

      // Build timeline dates header spanning full range (totalDays)
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        const dayBox = document.createElement('div');
        dayBox.className = 'timeline-day';
        dayBox.textContent = formatDateShort(d).split(' ')[1]; // Show day number only (e.g., 1,2,3)
        timelineHeader.appendChild(dayBox);
      }
      timelineWrapper.appendChild(timelineHeader);

      // Tasks row grouped by area inside this team - but as per your request, combine tasks of same team into one row, colored by project
      const tasksRow = document.createElement('div');
      tasksRow.className = 'tasks-row';

      // Each task as colored bar
      team.tasks.forEach(task => {
        const start = parseDateDMY(task.startDate);
        const end = parseDateDMY(task.endDate);
        if (!(start instanceof Date && end instanceof Date)) return;

        // Calculate left offset and width relative to minDate
        const leftDays = diffDays(minDate, start);
        const durationDays = diffDays(start, end) + 1;

        const taskBar = document.createElement('div');
        taskBar.className = 'task-bar';
        taskBar.style.left = `${leftDays * 30}px`; // 30px per day
        taskBar.style.width = `${durationDays * 30}px`;
        taskBar.style.backgroundColor = projectColors[task.projectId] || '#888';
        taskBar.title = `${task.projectName}\nArea: ${task.areaName}\n${task.notes || ''}\n${task.completed ? 'Completed' : 'Pending'}`;

        // Show area short name inside task bar (use initials)
        const areaShort = task.areaName
          .split(/\s+/)
          .map(w => w[0])
          .join('')
          .toUpperCase();
        taskBar.textContent = areaShort;

        tasksRow.appendChild(taskBar);
      });

      timelineWrapper.appendChild(tasksRow);

      // Add dotted lines below timeline header for easier reading
      const dottedLines = document.createElement('div');
      dottedLines.className = 'dotted-lines';
      for (let i = 0; i < totalDays; i++) {
        const line = document.createElement('div');
        line.className = 'dotted-line';
        dottedLines.appendChild(line);
      }
      timelineWrapper.appendChild(dottedLines);

      teamSection.appendChild(timelineWrapper);
      dashboardContainer.appendChild(teamSection);
    });
  }

  // Calculate difference in days between two dates
  function diffDays(date1, date2) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }

  // Capitalize each word
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  // Download dashboard as PNG
  btnDownloadDashboard.addEventListener('click', () => {
    downloadPageAsImage('ModernGypsumDashboard.png');
  });

  // Bind events if needed
  function bindEvents() {}

  document.addEventListener('DOMContentLoaded', init);
})();
