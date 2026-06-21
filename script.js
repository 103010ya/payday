// Ключ, под которым список смен хранится внутри localStorage.
const STORAGE_KEY = "paydayShifts";
// Отдельный ключ для последних введённых значений времени.
const LAST_TIME_KEY = "paydayLastShiftTime";

// Получаем нужные элементы страницы один раз при запуске приложения.
const shiftForm = document.querySelector("#shiftForm");
const shiftDateInput = document.querySelector("#shiftDate");
const datePickerButton = document.querySelector("#datePickerButton");
const selectedDateText = document.querySelector("#selectedDateText");
const datePickerOverlay = document.querySelector("#datePickerOverlay");
const datePickerTitle = document.querySelector("#datePickerTitle");
const calendarDays = document.querySelector("#calendarDays");
const previousMonthButton = document.querySelector("#previousMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");
const todayButton = document.querySelector("#todayButton");
const startTimeInput = document.querySelector("#startTime");
const endTimeInput = document.querySelector("#endTime");
const startTimeButton = document.querySelector("#startTimeButton");
const endTimeButton = document.querySelector("#endTimeButton");
const startTimeText = document.querySelector("#startTimeText");
const endTimeText = document.querySelector("#endTimeText");
const timePickerOverlay = document.querySelector("#timePickerOverlay");
const timePickerTitle = document.querySelector("#timePickerTitle");
const closeTimePickerButton = document.querySelector(
  "#closeTimePickerButton",
);
const hourWheel = document.querySelector("#hourWheel");
const minuteWheel = document.querySelector("#minuteWheel");
const confirmTimeButton = document.querySelector("#confirmTimeButton");
const saveButton = document.querySelector("#saveButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const saveMessage = document.querySelector("#saveMessage");
const monthSelect = document.querySelector("#monthSelect");
const monthPickerButton = document.querySelector("#monthPickerButton");
const selectedMonthText = document.querySelector("#selectedMonthText");
const monthPickerOverlay = document.querySelector("#monthPickerOverlay");
const monthOptions = document.querySelector("#monthOptions");
const confirmMonthButton = document.querySelector("#confirmMonthButton");
const closeMonthPickerButton = document.querySelector(
  "#closeMonthPickerButton",
);
const shiftActionsOverlay = document.querySelector("#shiftActionsOverlay");
const shiftActionsTitle = document.querySelector("#shiftActionsTitle");
const shiftActionsTime = document.querySelector("#shiftActionsTime");
const closeShiftActionsButton = document.querySelector(
  "#closeShiftActionsButton",
);
const editShiftButton = document.querySelector("#editShiftButton");
const deleteShiftButton = document.querySelector("#deleteShiftButton");
const shiftList = document.querySelector("#shiftList");
const emptyState = document.querySelector("#emptyState");
const shiftCount = document.querySelector("#shiftCount");
const navigationButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");

let messageTimer;
let visibleCalendarMonth = new Date();
let selectedShiftId = null;
let editingShiftId = null;
let activeTimeField = null;
let selectedHour = 0;
let selectedMinute = 0;
let hourScrollTimer;
let minuteScrollTimer;
let monthScrollTimer;
let availableMonthKeys = [];
let selectedMonthIndex = 0;

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD без сдвига часового пояса.
function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Преобразует объект Date в YYYY-MM-DD без влияния часового пояса.
function dateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Создаёт объект Date из значения YYYY-MM-DD.
function inputValueToDate(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Показывает выбранную дату в понятном русском формате.
function updateSelectedDateText() {
  const selectedDate = inputValueToDate(shiftDateInput.value);

  selectedDateText.textContent = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(selectedDate)
    .replace(/\s*г\.$/, "");
}

// Рисует дни открытого месяца. Добавляются также соседние дни для полной сетки.
function renderDatePicker() {
  const year = visibleCalendarMonth.getFullYear();
  const month = visibleCalendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayBasedDay = (firstDay.getDay() + 6) % 7;
  const gridStartDate = new Date(year, month, 1 - mondayBasedDay);
  const selectedDateValue = shiftDateInput.value;
  const todayValue = getTodayValue();

  datePickerTitle.textContent = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  })
    .format(firstDay)
    .replace(/\s*г\.$/, "");

  calendarDays.replaceChildren();

  for (let dayIndex = 0; dayIndex < 42; dayIndex += 1) {
    const dayDate = new Date(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + dayIndex,
    );
    const dateValue = dateToInputValue(dayDate);
    const dayButton = document.createElement("button");

    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.textContent = dayDate.getDate();
    dayButton.setAttribute(
      "aria-label",
      new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dayDate),
    );

    if (dayDate.getMonth() !== month) {
      dayButton.classList.add("calendar-day--outside");
    }

    if (dateValue === todayValue) {
      dayButton.classList.add("calendar-day--today");
    }

    if (dateValue === selectedDateValue) {
      dayButton.classList.add("calendar-day--selected");
      dayButton.setAttribute("aria-current", "date");
    }

    dayButton.addEventListener("click", () => {
      shiftDateInput.value = dateValue;
      visibleCalendarMonth = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        1,
      );
      updateSelectedDateText();
      closeDatePicker();
    });

    calendarDays.append(dayButton);
  }
}

// Открывает календарь на месяце выбранной даты.
function openDatePicker() {
  const selectedDate = inputValueToDate(shiftDateInput.value);
  visibleCalendarMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  );

  renderDatePicker();
  datePickerOverlay.hidden = false;
  datePickerButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("dialog-open");
  previousMonthButton.focus();
}

function closeDatePicker() {
  datePickerOverlay.hidden = true;
  datePickerButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("dialog-open");
  datePickerButton.focus();
}

// Записывает время в скрытое поле и обновляет текст видимой кнопки.
function setTimeValue(fieldName, timeValue) {
  const isStartTime = fieldName === "start";
  const input = isStartTime ? startTimeInput : endTimeInput;
  const text = isStartTime ? startTimeText : endTimeText;

  input.value = timeValue;
  text.textContent = timeValue || "--:--";
}

// Создаёт значения для прокрутки: часы 00–23 и минуты 00–59.
function createTimeWheelOptions() {
  for (let hour = 0; hour < 24; hour += 1) {
    const option = document.createElement("div");
    option.className = "time-wheel__option";
    option.textContent = String(hour).padStart(2, "0");
    option.dataset.value = hour;
    hourWheel.append(option);
  }

  for (let minute = 0; minute < 60; minute += 1) {
    const option = document.createElement("div");
    option.className = "time-wheel__option";
    option.textContent = String(minute).padStart(2, "0");
    option.dataset.value = minute;
    minuteWheel.append(option);
  }
}

// Выделяет значение, которое сейчас находится в центре прокрутки.
function updateWheelSelection(wheel, value) {
  wheel.querySelectorAll(".time-wheel__option").forEach((option) => {
    option.classList.toggle(
      "time-wheel__option--selected",
      Number(option.dataset.value) === value,
    );
  });
}

function getWheelValue(wheel, maximumValue) {
  const optionHeight = 54;
  return Math.min(maximumValue, Math.max(0, Math.round(wheel.scrollTop / optionHeight)));
}

function handleWheelScroll(wheel, type) {
  const isHourWheel = type === "hour";
  const timer = isHourWheel ? hourScrollTimer : minuteScrollTimer;

  window.clearTimeout(timer);

  const newTimer = window.setTimeout(() => {
    const value = getWheelValue(wheel, isHourWheel ? 23 : 59);

    if (isHourWheel) {
      selectedHour = value;
      hourScrollTimer = null;
    } else {
      selectedMinute = value;
      minuteScrollTimer = null;
    }

    updateWheelSelection(wheel, value);
    wheel.scrollTo({ top: value * 54, behavior: "smooth" });
  }, 80);

  if (isHourWheel) {
    hourScrollTimer = newTimer;
  } else {
    minuteScrollTimer = newTimer;
  }
}

// Открывает выбор времени для начала или окончания смены.
function openTimePicker(fieldName) {
  activeTimeField = fieldName;
  const currentValue =
    fieldName === "start" ? startTimeInput.value : endTimeInput.value;
  const fallbackValue = fieldName === "start" ? "09:00" : "18:00";
  const [hour, minute] = (currentValue || fallbackValue).split(":").map(Number);

  selectedHour = hour;
  selectedMinute = minute;
  timePickerTitle.textContent =
    fieldName === "start" ? "Начало смены" : "Конец смены";
  timePickerOverlay.hidden = false;
  document.body.classList.add("dialog-open");

  const activeButton =
    fieldName === "start" ? startTimeButton : endTimeButton;
  activeButton.setAttribute("aria-expanded", "true");

  requestAnimationFrame(() => {
    hourWheel.scrollTop = selectedHour * 54;
    minuteWheel.scrollTop = selectedMinute * 54;
    updateWheelSelection(hourWheel, selectedHour);
    updateWheelSelection(minuteWheel, selectedMinute);
  });

  closeTimePickerButton.focus();
}

function closeTimePicker(restoreFocus = true) {
  timePickerOverlay.hidden = true;
  document.body.classList.remove("dialog-open");

  const activeButton =
    activeTimeField === "start" ? startTimeButton : endTimeButton;
  activeButton?.setAttribute("aria-expanded", "false");

  if (restoreFocus) {
    activeButton?.focus();
  }
}

// Безопасно читает сохранённые смены. Если данных ещё нет, возвращает пустой список.
function getSavedShifts() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const parsedData = savedData ? JSON.parse(savedData) : [];

    if (!Array.isArray(parsedData)) {
      return [];
    }

    // Для каждой даты оставляем только последнюю сохранённую запись.
    const uniqueShiftsByDate = new Map();
    parsedData.forEach((shift) => uniqueShiftsByDate.set(shift.date, shift));

    return [...uniqueShiftsByDate.values()];
  } catch (error) {
    console.error("Не удалось прочитать сохранённые смены:", error);
    return [];
  }
}

// Полностью обновляет список смен в localStorage.
function saveShifts(shifts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

// Создаёт ключ месяца YYYY-MM из полной даты смены.
function getMonthKey(dateValue) {
  return dateValue.slice(0, 7);
}

// Превращает YYYY-MM в понятное русское название, например «Июнь 2026».
function formatMonthName(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/\s*г\.$/, "");

  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

// Преобразует дату из YYYY-MM-DD в требуемый вид YYYY/MM/DD.
function formatShiftDate(dateValue) {
  return dateValue.replaceAll("-", "/");
}

// Возвращает только те месяцы, в которых есть сохранённые смены.
function getAvailableMonths(shifts) {
  const monthKeys = new Set();
  shifts.forEach((shift) => monthKeys.add(getMonthKey(shift.date)));

  return [...monthKeys].sort((firstMonth, secondMonth) =>
    secondMonth.localeCompare(firstMonth),
  );
}

// Обновляет выбранный месяц и создаёт значения для прокручиваемого колеса.
function renderMonthOptions(preferredMonth) {
  const shifts = getSavedShifts();
  const availableMonths = getAvailableMonths(shifts);
  const currentSelection = preferredMonth || monthSelect.value || getMonthKey(getTodayValue());
  availableMonthKeys = availableMonths;

  // Если смен ещё нет, показываем текущий месяц, но не добавляем пустые месяцы в список.
  if (availableMonths.length === 0) {
    monthSelect.value = getMonthKey(getTodayValue());
    selectedMonthText.textContent = formatMonthName(monthSelect.value);
    monthOptions.replaceChildren();

    const emptyMessage = document.createElement("p");
    emptyMessage.className = "month-options__empty";
    emptyMessage.textContent = "Нет сохранённых месяцев";
    monthOptions.append(emptyMessage);
    confirmMonthButton.hidden = true;
    return;
  }

  monthSelect.value = availableMonths.includes(currentSelection)
    ? currentSelection
    : availableMonths[0];
  selectedMonthText.textContent = formatMonthName(monthSelect.value);
  monthOptions.replaceChildren();
  confirmMonthButton.hidden = false;
  selectedMonthIndex = availableMonths.indexOf(monthSelect.value);

  availableMonths.forEach((monthKey, index) => {
    const option = document.createElement("div");
    option.className = "month-option";
    option.textContent = formatMonthName(monthKey);
    option.dataset.index = index;
    monthOptions.append(option);
  });

  updateMonthWheelSelection();
}

function updateMonthWheelSelection() {
  monthOptions.querySelectorAll(".month-option").forEach((option) => {
    option.classList.toggle(
      "month-option--selected",
      Number(option.dataset.index) === selectedMonthIndex,
    );
  });
}

function handleMonthWheelScroll() {
  window.clearTimeout(monthScrollTimer);

  monthScrollTimer = window.setTimeout(() => {
    selectedMonthIndex = Math.min(
      availableMonthKeys.length - 1,
      Math.max(0, Math.round(monthOptions.scrollTop / 54)),
    );

    updateMonthWheelSelection();
    monthOptions.scrollTo({
      top: selectedMonthIndex * 54,
      behavior: "smooth",
    });
  }, 80);
}

function openMonthPicker() {
  renderMonthOptions();
  monthPickerOverlay.hidden = false;
  monthPickerButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("dialog-open");

  requestAnimationFrame(() => {
    monthOptions.scrollTop = selectedMonthIndex * 54;
    updateMonthWheelSelection();
  });

  closeMonthPickerButton.focus();
}

function closeMonthPicker() {
  monthPickerOverlay.hidden = true;
  monthPickerButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("dialog-open");
  monthPickerButton.focus();
}

// Открывает меню действий для смены, на которую нажал пользователь.
function openShiftActions(shift) {
  selectedShiftId = shift.id;
  shiftActionsTitle.textContent = formatShiftDate(shift.date);
  shiftActionsTime.textContent = `${shift.startTime} — ${shift.endTime}`;
  shiftActionsOverlay.hidden = false;
  document.body.classList.add("dialog-open");
  closeShiftActionsButton.focus();
}

function closeShiftActions(restoreFocus = true) {
  shiftActionsOverlay.hidden = true;
  document.body.classList.remove("dialog-open");

  if (restoreFocus && selectedShiftId) {
    shiftList
      .querySelector(`[data-shift-id="${CSS.escape(selectedShiftId)}"]`)
      ?.focus();
  }
}

// Возвращает форму в обычный режим создания новой смены.
function finishEditing() {
  editingShiftId = null;
  saveButton.textContent = "Сохранить";
  cancelEditButton.hidden = true;
}

// Создаёт одну карточку смены без вставки HTML-строк из localStorage.
function createShiftCard(shift) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "shift-card";
  card.dataset.shiftId = shift.id;
  card.setAttribute(
    "aria-label",
    `Смена ${formatShiftDate(shift.date)}, с ${shift.startTime} до ${shift.endTime}`,
  );

  const date = document.createElement("h2");
  date.className = "shift-card__date";
  date.textContent = formatShiftDate(shift.date);

  const details = document.createElement("div");
  details.className = "shift-card__details";

  const startRow = createTimeRow("Начало смены", shift.startTime);
  const endRow = createTimeRow("Конец смены", shift.endTime);

  details.append(startRow, endRow);
  card.append(date, details);
  card.addEventListener("click", () => openShiftActions(shift));

  return card;
}

// Вспомогательная функция для строки «название — время».
function createTimeRow(label, time) {
  const row = document.createElement("div");
  row.className = "shift-card__row";

  const labelElement = document.createElement("span");
  labelElement.textContent = label;

  const timeElement = document.createElement("span");
  timeElement.className = "shift-card__time";
  timeElement.textContent = time;

  row.append(labelElement, timeElement);
  return row;
}

// Показывает только смены, относящиеся к выбранному месяцу.
function renderShifts() {
  const selectedMonth = monthSelect.value;
  const shiftsForMonth = getSavedShifts()
    .filter((shift) => getMonthKey(shift.date) === selectedMonth)
    .sort((firstShift, secondShift) => {
      const dateComparison = secondShift.date.localeCompare(firstShift.date);

      return dateComparison || secondShift.startTime.localeCompare(firstShift.startTime);
    });

  shiftList.replaceChildren();
  shiftsForMonth.forEach((shift) => shiftList.append(createShiftCard(shift)));

  const hasShifts = shiftsForMonth.length > 0;
  shiftList.hidden = !hasShifts;
  emptyState.hidden = hasShifts;
  shiftCount.textContent = shiftsForMonth.length;
}

// Коротко показывает подтверждение и затем плавно его скрывает.
function showSavedMessage(message = "Смена сохранена") {
  window.clearTimeout(messageTimer);
  saveMessage.textContent = message;
  saveMessage.classList.add("save-message--visible");

  messageTimer = window.setTimeout(() => {
    saveMessage.classList.remove("save-message--visible");
  }, 2200);
}

// Переключает видимый раздел и выделяет активную кнопку внизу.
function showPage(pageId) {
  document.body.classList.toggle("home-page-active", pageId === "homePage");

  pages.forEach((page) => {
    const isActive = page.id === pageId;
    page.hidden = !isActive;
  });

  navigationButtons.forEach((button) => {
    const isActive = button.dataset.page === pageId;
    button.classList.toggle("nav-button--active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (pageId === "calendarPage") {
    renderMonthOptions();
    renderShifts();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Сохраняет новую смену или обновляет выбранную запись.
shiftForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!startTimeInput.value || !endTimeInput.value) {
    showSavedMessage("Выберите начало и конец смены");
    return;
  }

  const newShift = {
    id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`,
    date: shiftDateInput.value,
    startTime: startTimeInput.value,
    endTime: endTimeInput.value,
  };

  const shifts = getSavedShifts();
  const wasEditing = Boolean(editingShiftId);
  const existingShiftIndex = shifts.findIndex((shift) => {
    if (wasEditing) {
      return shift.id === editingShiftId;
    }

    return shift.date === newShift.date;
  });

  if (wasEditing) {
    // Удаляем старую запись и возможную запись с новой выбранной датой.
    newShift.id = editingShiftId;
    const shiftsWithoutOldValues = shifts.filter(
      (shift) =>
        shift.id !== editingShiftId && shift.date !== newShift.date,
    );
    shiftsWithoutOldValues.push(newShift);
    saveShifts(shiftsWithoutOldValues);
  } else if (existingShiftIndex >= 0) {
    // Если такая дата уже есть, заменяем время вместо создания дубля.
    newShift.id = shifts[existingShiftIndex].id;
    shifts[existingShiftIndex] = newShift;
    saveShifts(shifts);
  } else {
    shifts.push(newShift);
    saveShifts(shifts);
  }

  // Запоминаем время, чтобы при следующем открытии не вводить его заново.
  localStorage.setItem(
    LAST_TIME_KEY,
    JSON.stringify({
      startTime: newShift.startTime,
      endTime: newShift.endTime,
    }),
  );

  renderMonthOptions(getMonthKey(newShift.date));
  showSavedMessage(
    wasEditing || existingShiftIndex >= 0
      ? "Смена обновлена"
      : "Смена сохранена",
  );
  finishEditing();
});

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

monthPickerButton.addEventListener("click", openMonthPicker);
closeMonthPickerButton.addEventListener("click", closeMonthPicker);

monthOptions.addEventListener("scroll", handleMonthWheelScroll);

confirmMonthButton.addEventListener("click", () => {
  if (availableMonthKeys.length === 0) {
    closeMonthPicker();
    return;
  }

  // Ещё раз читаем положение колеса перед подтверждением.
  selectedMonthIndex = Math.min(
    availableMonthKeys.length - 1,
    Math.max(0, Math.round(monthOptions.scrollTop / 54)),
  );

  const selectedMonth = availableMonthKeys[selectedMonthIndex];
  monthSelect.value = selectedMonth;
  selectedMonthText.textContent = formatMonthName(selectedMonth);
  renderShifts();
  closeMonthPicker();
});

monthPickerOverlay.addEventListener("click", (event) => {
  if (event.target === monthPickerOverlay) {
    closeMonthPicker();
  }
});

closeShiftActionsButton.addEventListener("click", () => closeShiftActions());

shiftActionsOverlay.addEventListener("click", (event) => {
  if (event.target === shiftActionsOverlay) {
    closeShiftActions();
  }
});

editShiftButton.addEventListener("click", () => {
  const shift = getSavedShifts().find((item) => item.id === selectedShiftId);

  if (!shift) {
    closeShiftActions(false);
    return;
  }

  editingShiftId = shift.id;
  shiftDateInput.value = shift.date;
  setTimeValue("start", shift.startTime);
  setTimeValue("end", shift.endTime);
  updateSelectedDateText();
  saveButton.textContent = "Сохранить изменения";
  cancelEditButton.hidden = false;

  closeShiftActions(false);
  showPage("homePage");
});

deleteShiftButton.addEventListener("click", () => {
  const remainingShifts = getSavedShifts().filter(
    (shift) => shift.id !== selectedShiftId,
  );

  saveShifts(remainingShifts);
  closeShiftActions(false);
  renderMonthOptions();
  renderShifts();
  selectedShiftId = null;
});

cancelEditButton.addEventListener("click", () => {
  finishEditing();
  shiftDateInput.value = getTodayValue();
  updateSelectedDateText();
});

startTimeButton.addEventListener("click", () => openTimePicker("start"));
endTimeButton.addEventListener("click", () => openTimePicker("end"));

closeTimePickerButton.addEventListener("click", () => closeTimePicker());

timePickerOverlay.addEventListener("click", (event) => {
  if (event.target === timePickerOverlay) {
    closeTimePicker();
  }
});

hourWheel.addEventListener("scroll", () => {
  handleWheelScroll(hourWheel, "hour");
});

minuteWheel.addEventListener("scroll", () => {
  handleWheelScroll(minuteWheel, "minute");
});

confirmTimeButton.addEventListener("click", () => {
  // Перед подтверждением ещё раз читаем положение колёс.
  selectedHour = getWheelValue(hourWheel, 23);
  selectedMinute = getWheelValue(minuteWheel, 59);

  const timeValue = `${String(selectedHour).padStart(2, "0")}:${String(
    selectedMinute,
  ).padStart(2, "0")}`;

  setTimeValue(activeTimeField, timeValue);
  closeTimePicker();
});

datePickerButton.addEventListener("click", openDatePicker);

previousMonthButton.addEventListener("click", () => {
  visibleCalendarMonth = new Date(
    visibleCalendarMonth.getFullYear(),
    visibleCalendarMonth.getMonth() - 1,
    1,
  );
  renderDatePicker();
});

nextMonthButton.addEventListener("click", () => {
  visibleCalendarMonth = new Date(
    visibleCalendarMonth.getFullYear(),
    visibleCalendarMonth.getMonth() + 1,
    1,
  );
  renderDatePicker();
});

todayButton.addEventListener("click", () => {
  shiftDateInput.value = getTodayValue();
  updateSelectedDateText();
  closeDatePicker();
});

datePickerOverlay.addEventListener("click", (event) => {
  if (event.target === datePickerOverlay) {
    closeDatePicker();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!datePickerOverlay.hidden) {
      closeDatePicker();
    } else if (!monthPickerOverlay.hidden) {
      closeMonthPicker();
    } else if (!shiftActionsOverlay.hidden) {
      closeShiftActions();
    } else if (!timePickerOverlay.hidden) {
      closeTimePicker();
    }
  }
});

// Начальные значения при первом открытии приложения.
shiftDateInput.value = getTodayValue();
updateSelectedDateText();
createTimeWheelOptions();

// Восстанавливаем время, которое пользователь сохранял в прошлый раз.
try {
  const lastTime = JSON.parse(localStorage.getItem(LAST_TIME_KEY));

  if (lastTime) {
    setTimeValue("start", lastTime.startTime || "");
    setTimeValue("end", lastTime.endTime || "");
  }
} catch (error) {
  console.error("Не удалось восстановить последнее время смены:", error);
}

renderMonthOptions();
renderShifts();
