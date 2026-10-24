import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from '../core.js';
import { createWidgetView } from '../ui/widget-view.js';


export function mountCalendar(context, services) {
  const { scope } = context;
  const { $, showDialog } = createWidgetView(context, 'calendar', ['tasks-dialog']);
  const uid = () => crypto.randomUUID();
  let calendarDate = new Date(), activeTaskDate = null;
  let calendarTasks = services.getTasks();
  function saveCalendarTasks(date) {
    services.saveTasks(date, calendarTasks[date] || []).catch(() => services.toast('Tasks could not be saved.'));
  }
function renderCalendar() {
  const focusedDate = document.activeElement?.dataset.date;
  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  $('#calendar-heading').textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const today = calendarDateKey(new Date());
  const nodes = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => {
    const el = document.createElement('span'); el.className = 'weekday'; el.textContent = day; return el;
  });
  for (const { date, current } of calendarDays(year, month)) {
    const key = calendarDateKey(date), tasks = calendarTasks[key] || [];
    const el = document.createElement('button'); el.type = 'button'; el.dataset.date = key;
    el.textContent = date.getDate();
    el.className = `calendar-day${key === today ? ' today' : current ? '' : ' other'}`;
    const label = date.toLocaleDateString('en-US', { dateStyle: 'full' });
    el.setAttribute('aria-label', `${label}${tasks.length ? `, ${tasks.filter(task => !task.completed).length} of ${tasks.length} tasks remaining` : ''}`);
    el.setAttribute('aria-haspopup', 'dialog');
    el.title = `${label} · Double-click for tasks`;
    if (key === today) el.setAttribute('aria-current', 'date');
    if (tasks.length) {
      el.classList.add('has-tasks');
      el.classList.toggle('tasks-complete', tasks.every(task => task.completed));
    }
    el.addEventListener('dblclick', () => openTasks(date));
    // Native button activation keeps the same panel accessible by keyboard.
    el.addEventListener('click', event => { if (event.detail === 0) openTasks(date); });
    nodes.push(el);
  }
  $('#calendar').replaceChildren(...nodes);
  if (focusedDate) $('#calendar').querySelector(`[data-date="${focusedDate}"]`)?.focus({ preventScroll: true });
}
$('#month-prev').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); });
$('#month-next').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); });
$('#month-today').addEventListener('click', () => { calendarDate = new Date(); renderCalendar(); });

function updateTaskCount() {
  $('#task-count').textContent = `${$('#task-title').value.length} / ${TASK_TITLE_LIMIT}`;
  $('#task-error').hidden = true;
}

function openTasks(date) {
  activeTaskDate = calendarDateKey(date);
  $('#tasks-heading').textContent = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  $('#task-form').reset(); updateTaskCount(); renderTasks(); showDialog('#tasks-dialog'); $('#task-title').focus();
}

function renderTasks() {
  const tasks = calendarTasks[activeTaskDate] || [];
  const focusedTask = document.activeElement?.dataset.taskId;
  const focusedAction = document.activeElement?.dataset.taskAction;
  $('#task-list').replaceChildren(...tasks.map(task => {
    const row = document.createElement('li'); row.className = 'task-row'; row.classList.toggle('completed', task.completed);
    const label = document.createElement('label'); label.className = 'task-label';
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.className = 'task-toggle'; toggle.checked = task.completed;
    toggle.dataset.taskId = task.id; toggle.dataset.taskAction = 'toggle';
    toggle.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Complete'} task: ${task.title}`);
    const title = document.createElement('span'); title.className = 'task-text'; title.textContent = task.title;
    toggle.addEventListener('change', () => {
      task.completed = toggle.checked; row.classList.toggle('completed', task.completed);
      toggle.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Complete'} task: ${task.title}`);
      saveCalendarTasks(activeTaskDate); renderCalendar(); updateTaskSummary();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button task-remove'; remove.textContent = '×';
    remove.dataset.taskId = task.id; remove.dataset.taskAction = 'remove'; remove.setAttribute('aria-label', `Delete task: ${task.title}`);
    remove.addEventListener('click', () => {
      calendarTasks[activeTaskDate] = (calendarTasks[activeTaskDate] || []).filter(item => item.id !== task.id);
      saveCalendarTasks(activeTaskDate); renderTasks(); renderCalendar(); $('#task-title').focus();
    });
    label.append(toggle, title); row.append(label, remove); return row;
  }));
  $('#tasks-empty').hidden = tasks.length > 0;
  updateTaskSummary();
  if (focusedTask) {
    const target = [...$('#task-list').querySelectorAll('[data-task-id]')].find(el => el.dataset.taskId === focusedTask && el.dataset.taskAction === focusedAction);
    target?.focus({ preventScroll: true });
  }
}

function updateTaskSummary() {
  const tasks = calendarTasks[activeTaskDate] || [];
  const remaining = tasks.filter(task => !task.completed).length;
  $('#tasks-summary').textContent = tasks.length ? `${remaining} remaining · ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : '';
}

$('#tasks-dialog').addEventListener('close', () => {
  $('#calendar').querySelector(`[data-date="${activeTaskDate}"]`)?.focus({ preventScroll: true });
});
$('#task-title').maxLength = TASK_TITLE_LIMIT;
$('#task-title').addEventListener('input', updateTaskCount);
$('#task-form').addEventListener('submit', event => {
  event.preventDefault(); if (!activeTaskDate) return;
  const title = $('#task-title').value.replace(/\s+/g, ' ').trim();
  if (!title || title.length > TASK_TITLE_LIMIT) {
    $('#task-error').textContent = `Enter a task title of 1–${TASK_TITLE_LIMIT} characters.`; $('#task-error').hidden = false; return;
  }
  calendarTasks[activeTaskDate] ||= [];
  calendarTasks[activeTaskDate].push({ id: uid(), title, completed: false });
  saveCalendarTasks(activeTaskDate); $('#task-form').reset(); updateTaskCount(); renderTasks(); renderCalendar(); $('#task-title').focus();
});

  const refresh = () => { renderCalendar(); if ($('#tasks-dialog').open) renderTasks(); };
  scope.cleanup(services.subscribe(kind => { if (kind === 'tasks') { calendarTasks = services.getTasks(); refresh(); } }));
  scope.interval(renderCalendar, 60000);
  scope.listen(document, 'visibilitychange', () => { if (!document.hidden) refresh(); });
  renderCalendar();
  return { update: refresh };
}
