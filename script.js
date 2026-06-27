import {
  deleteCloudShift,
  isFirebaseConfigured,
  loadCloudShifts,
  loginAccount,
  logoutAccount,
  observeAuthState,
  registerAccount,
  resetAccountPassword,
  saveCloudShift,
  uploadCloudShifts,
} from "./firebase-service.js";

// Ключ, под которым список смен хранится внутри localStorage.
const STORAGE_KEY = "paydayShifts";
// Отдельный ключ для последних введённых значений времени.
const LAST_TIME_KEY = "paydayLastShiftTime";
// Базовая ставка за час для расчёта зарплаты.
const BASE_RATE_KEY = "paydayBaseRate";

// Получаем нужные элементы страницы один раз при запуске приложения.
const shiftForm = document.querySelector("#shiftForm");
const profileButton = document.querySelector("#profileButton");
const closeProfileButton = document.querySelector("#closeProfileButton");
const loginTabButton = document.querySelector("#loginTabButton");
const registerTabButton = document.querySelector("#registerTabButton");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const authGuestView = document.querySelector("#authGuestView");
const authUserView = document.querySelector("#authUserView");
const accountName = document.querySelector("#accountName");
const accountEmail = document.querySelector("#accountEmail");
const accountSyncText = document.querySelector("#accountSyncText");
const logoutButton = document.querySelector("#logoutButton");
const authPreviewMessage = document.querySelector("#authPreviewMessage");
const shiftDateInput = document.querySelector("#shiftDate");
const previousShiftDateButton = document.querySelector(
  "#previousShiftDateButton",
);
const nextShiftDateButton = document.querySelector("#nextShiftDateButton");
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
const lunchBreakInput = document.querySelector("#lunchBreak");
const dinnerBreakInput = document.querySelector("#dinnerBreak");
const lunchBreakButton = document.querySelector("#lunchBreakButton");
const dinnerBreakButton = document.querySelector("#dinnerBreakButton");
const lunchBreakText = document.querySelector("#lunchBreakText");
const dinnerBreakText = document.querySelector("#dinnerBreakText");
const startTimeButton = document.querySelector("#startTimeButton");
const endTimeButton = document.querySelector("#endTimeButton");
const startTimeText = document.querySelector("#startTimeText");
const endTimeText = document.querySelector("#endTimeText");
const timePickerOverlay = document.querySelector("#timePickerOverlay");
const hourValue = document.querySelector("#hourValue");
const minuteValue = document.querySelector("#minuteValue");
const increaseHourButton = document.querySelector("#increaseHourButton");
const decreaseHourButton = document.querySelector("#decreaseHourButton");
const increaseMinuteButton = document.querySelector("#increaseMinuteButton");
const decreaseMinuteButton = document.querySelector("#decreaseMinuteButton");
const confirmTimeButton = document.querySelector("#confirmTimeButton");
const breakPickerOverlay = document.querySelector("#breakPickerOverlay");
const breakValue = document.querySelector("#breakValue");
const increaseBreakButton = document.querySelector("#increaseBreakButton");
const decreaseBreakButton = document.querySelector("#decreaseBreakButton");
const confirmBreakButton = document.querySelector("#confirmBreakButton");
const saveButton = document.querySelector("#saveButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const saveMessage = document.querySelector("#saveMessage");
const saveMessageText = document.querySelector("#saveMessageText");
const monthSelect = document.querySelector("#monthSelect");
const selectedMonthText = document.querySelector("#selectedMonthText");
const previousHistoryMonthButton = document.querySelector(
  "#previousHistoryMonthButton",
);
const nextHistoryMonthButton = document.querySelector(
  "#nextHistoryMonthButton",
);
const shiftActionsOverlay = document.querySelector("#shiftActionsOverlay");
const shiftActionsDetails = document.querySelector("#shiftActionsDetails");
const editShiftButton = document.querySelector("#editShiftButton");
const deleteShiftButton = document.querySelector("#deleteShiftButton");
const salaryEstimateOverlay = document.querySelector(
  "#salaryEstimateOverlay",
);
const salaryEstimateMonth = document.querySelector("#salaryEstimateMonth");
const baseRateInput = document.querySelector("#baseRateInput");
const salaryTotalHours = document.querySelector("#salaryTotalHours");
const salaryBreakdown = document.querySelector("#salaryBreakdown");
const salaryTotalAmount = document.querySelector("#salaryTotalAmount");
const historyScrollArea = document.querySelector(".history-scroll-area");
const shiftList = document.querySelector("#shiftList");
const emptyState = document.querySelector("#emptyState");
const shiftCount = document.querySelector("#shiftCount");
const navigationButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");

let messageTimer;
let activePageId = "homePage";
let currentUser = null;
let visibleCalendarMonth = new Date();
let selectedShiftId = null;
let editingShiftId = null;
let editingOriginalDate = null;
let activeTimeField = null;
let activeBreakField = null;
let selectedHour = 0;
let selectedMinute = 0;
let selectedBreakMinutes = 0;
let availableMonthKeys = [];
let selectedMonthIndex = 0;

// Категории оплаты. Сумма считается как «основная ставка × коэффициент».
const PAY_CATEGORIES = {
  regular: {
    label: "Обычные часы",
    multiplier: 1,
  },
  overtime: {
    label: "Сверхурочные",
    multiplier: 1.5,
  },
  weekend: {
    label: "Выходные",
    multiplier: 1.5,
  },
  weekendOvertime: {
    label: "Выходные сверхурочные",
    multiplier: 2,
  },
  night: {
    label: "Ночные",
    multiplier: 1.5,
  },
  weekendNight: {
    label: "Ночные в выходной",
    multiplier: 2,
  },
  nightOvertime: {
    label: "Ночные сверхурочные",
    multiplier: 2.5,
  },
};

const PAY_CATEGORY_ORDER = [
  "regular",
  "overtime",
  "weekend",
  "weekendOvertime",
  "night",
  "weekendNight",
  "nightOvertime",
];

const OVERTIME_START_MINUTE = 8 * 60;
const DEFAULT_BASE_RATE = 10320;

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

// Меняет дату на главной на нужное количество дней.
// Например: -1 — предыдущий день, 1 — следующий день.
function changeShiftDateByDays(dayOffset) {
  const currentDate = inputValueToDate(shiftDateInput.value || getTodayValue());

  currentDate.setDate(currentDate.getDate() + dayOffset);
  shiftDateInput.value = dateToInputValue(currentDate);
  updateSelectedDateText();
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

// Обновляет крупные значения часов и минут во всплывающем окне.
function renderTimeStepper() {
  hourValue.textContent = String(selectedHour).padStart(2, "0");
  minuteValue.textContent = String(selectedMinute).padStart(2, "0");
}

// Изменяет значение циклически: после максимума снова начинается с нуля.
function changeTimePart(type, direction) {
  if (type === "hour") {
    selectedHour = (selectedHour + direction + 24) % 24;
  } else {
    selectedMinute = (selectedMinute + direction + 60) % 60;
  }

  renderTimeStepper();
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
  timePickerOverlay.hidden = false;
  document.body.classList.add("dialog-open");

  const activeButton =
    fieldName === "start" ? startTimeButton : endTimeButton;
  activeButton.setAttribute("aria-expanded", "true");

  renderTimeStepper();

  increaseHourButton.focus();
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

function renderBreakStepper() {
  breakValue.textContent = String(selectedBreakMinutes);
}

function changeBreakMinutes(direction) {
  const maxBreakMinutes = 240;
  const stepMinutes = 10;
  selectedBreakMinutes =
    (selectedBreakMinutes +
      direction * stepMinutes +
      maxBreakMinutes +
      stepMinutes) %
    (maxBreakMinutes + stepMinutes);

  renderBreakStepper();
}

function openBreakPicker(fieldName) {
  activeBreakField = fieldName;
  const currentValue =
    fieldName === "lunch" ? lunchBreakInput.value : dinnerBreakInput.value;

  selectedBreakMinutes = breakValueToMinutes(currentValue) || 0;
  breakPickerOverlay.hidden = false;
  document.body.classList.add("dialog-open");

  const activeButton =
    fieldName === "lunch" ? lunchBreakButton : dinnerBreakButton;
  activeButton.setAttribute("aria-expanded", "true");

  renderBreakStepper();
  increaseBreakButton.focus();
}

function closeBreakPicker(restoreFocus = true) {
  breakPickerOverlay.hidden = true;
  document.body.classList.remove("dialog-open");

  const activeButton =
    activeBreakField === "lunch" ? lunchBreakButton : dinnerBreakButton;
  activeButton?.setAttribute("aria-expanded", "false");

  if (restoreFocus) {
    activeButton?.focus();
  }
}

// Безопасно читает сохранённые смены. Если данных ещё нет, возвращает пустой список.
function getActiveStorageKey() {
  return currentUser ? `${STORAGE_KEY}:${currentUser.uid}` : STORAGE_KEY;
}

function getSavedShifts() {
  try {
    const savedData = localStorage.getItem(getActiveStorageKey());
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
  localStorage.setItem(getActiveStorageKey(), JSON.stringify(shifts));
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

// Переводит время HH:MM в количество минут от начала суток.
function timeToMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return hours * 60 + minutes;
}

// Возвращает длительность смены. Конец раньше начала означает переход через полночь.
function getShiftDurationMinutes(shift) {
  const startMinutes = timeToMinutes(shift.startTime);
  let endMinutes = timeToMinutes(shift.endTime);

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

function formatHoursAndMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

function formatWon(amount) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₩`;
}

function formatMultiplier(multiplier) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(multiplier);
}

// Превращает длительность перерыва в минуты.
// Можно вводить «01:00» или просто «60».
function breakValueToMinutes(value) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return 0;
  }

  if (cleanValue.includes(":")) {
    const [hours = "0", minutes = "0"] = cleanValue.split(":");
    const parsedHours = Number(hours);
    const parsedMinutes = Number(minutes);

    if (
      Number.isNaN(parsedHours) ||
      Number.isNaN(parsedMinutes) ||
      parsedHours < 0 ||
      parsedMinutes < 0 ||
      parsedMinutes > 59
    ) {
      return null;
    }

    return parsedHours * 60 + parsedMinutes;
  }

  const parsedMinutes = Number(cleanValue);

  if (Number.isNaN(parsedMinutes) || parsedMinutes < 0) {
    return null;
  }

  return parsedMinutes;
}

function formatBreakDisplay(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);

  return `${safeMinutes} мин`;
}

function setBreakValue(fieldName, minutes) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const input = fieldName === "lunch" ? lunchBreakInput : dinnerBreakInput;
  const text = fieldName === "lunch" ? lunchBreakText : dinnerBreakText;

  input.value = String(safeMinutes);
  text.textContent = formatBreakDisplay(safeMinutes);
}

function getShiftBreakMinutes(shift) {
  return (
    (Number(shift.lunchBreakMinutes) || 0) +
    (Number(shift.dinnerBreakMinutes) || 0)
  );
}

function getBaseRate() {
  const savedRate = Number(localStorage.getItem(BASE_RATE_KEY));

  return savedRate > 0 ? savedRate : DEFAULT_BASE_RATE;
}

function setBaseRate(rate) {
  const safeRate = Math.max(0, Number(rate) || 0);

  localStorage.setItem(BASE_RATE_KEY, String(safeRate || DEFAULT_BASE_RATE));
  baseRateInput.value = String(safeRate || DEFAULT_BASE_RATE);
}

// Создаёт точную дату и время начала смены.
function getShiftStartDateTime(shift) {
  const startDate = inputValueToDate(shift.date);
  const [hours, minutes] = shift.startTime.split(":").map(Number);

  startDate.setHours(hours, minutes, 0, 0);

  return startDate;
}

// Суббота и воскресенье считаются выходными.
function isWeekendDate(date) {
  const day = date.getDay();

  return day === 0 || day === 6;
}

// Ночной промежуток: с 22:00 до 06:00.
function isNightMinute(date) {
  const hour = date.getHours();

  return hour >= 22 || hour < 6;
}

// Определяет категорию оплаты для одной конкретной минуты работы.
function getPayCategoryForMinute(date, paidMinuteIndex) {
  const isOvertime = paidMinuteIndex >= OVERTIME_START_MINUTE;
  const isWeekend = isWeekendDate(date);
  const isNight = isNightMinute(date);

  // Ночная переработка имеет самую высокую ставку.
  if (isNight && isOvertime) {
    return "nightOvertime";
  }

  if (isNight && isWeekend) {
    return "weekendNight";
  }

  if (isNight) {
    return "night";
  }

  if (isWeekend && isOvertime) {
    return "weekendOvertime";
  }

  if (isWeekend) {
    return "weekend";
  }

  if (isOvertime) {
    return "overtime";
  }

  return "regular";
}

// Разбивает одну смену по категориям оплаты.
function calculateShiftPayBreakdown(shift) {
  const breakdown = Object.fromEntries(
    PAY_CATEGORY_ORDER.map((category) => [category, 0]),
  );
  const startDateTime = getShiftStartDateTime(shift);
  const durationMinutes = getShiftDurationMinutes(shift);
  const paidDurationMinutes = Math.max(
    0,
    durationMinutes - getShiftBreakMinutes(shift),
  );
  let paidMinuteIndex = 0;

  // Идём только по оплачиваемым минутам. Перерывы уже вычтены из общей длительности.
  for (let minuteIndex = 0; minuteIndex < paidDurationMinutes; minuteIndex += 1) {
    const currentMinute = new Date(
      startDateTime.getTime() + minuteIndex * 60 * 1000,
    );
    const category = getPayCategoryForMinute(currentMinute, paidMinuteIndex);

    breakdown[category] += 1;
    paidMinuteIndex += 1;
  }

  return breakdown;
}

// Складывает расчёт всех смен выбранного месяца.
function calculateMonthPaySummary(shifts, baseRate) {
  const breakdown = Object.fromEntries(
    PAY_CATEGORY_ORDER.map((category) => [category, 0]),
  );

  shifts.forEach((shift) => {
    const shiftBreakdown = calculateShiftPayBreakdown(shift);

    PAY_CATEGORY_ORDER.forEach((category) => {
      breakdown[category] += shiftBreakdown[category];
    });
  });

  const totalMinutes = PAY_CATEGORY_ORDER.reduce(
    (sum, category) => sum + breakdown[category],
    0,
  );
  const totalAmount = PAY_CATEGORY_ORDER.reduce((sum, category) => {
    const rate = baseRate * PAY_CATEGORIES[category].multiplier;

    return sum + Math.round((breakdown[category] * rate) / 60);
  }, 0);

  return {
    breakdown,
    totalMinutes,
    totalAmount,
  };
}

// Создаёт строку с количеством часов по одной категории.
function createSalaryBreakdownRow(category, minutes, baseRate) {
  const row = document.createElement("div");
  row.className = "salary-breakdown-row";

  const label = document.createElement("span");
  label.textContent = PAY_CATEGORIES[category].label;

  const value = document.createElement("strong");
  value.textContent = formatHoursAndMinutes(minutes);

  const rate = document.createElement("small");
  const multiplier = PAY_CATEGORIES[category].multiplier;
  const hourlyRate = Math.round(baseRate * multiplier);

  rate.textContent = `×${formatMultiplier(multiplier)} · ${formatWon(hourlyRate)}/ч`;

  row.append(label, value, rate);
  return row;
}

// Возвращает только те месяцы, в которых есть сохранённые смены.
function getAvailableMonths(shifts) {
  const monthKeys = new Set();
  shifts.forEach((shift) => monthKeys.add(getMonthKey(shift.date)));

  return [...monthKeys].sort((firstMonth, secondMonth) =>
    secondMonth.localeCompare(firstMonth),
  );
}

// Обновляет месяц истории и состояние стрелок.
function renderMonthOptions(preferredMonth) {
  const shifts = getSavedShifts();
  const availableMonths = getAvailableMonths(shifts);
  const currentSelection = preferredMonth || monthSelect.value || getMonthKey(getTodayValue());
  availableMonthKeys = availableMonths;

  // Если смен ещё нет, показываем текущий месяц и отключаем стрелки.
  if (availableMonths.length === 0) {
    monthSelect.value = getMonthKey(getTodayValue());
    selectedMonthText.textContent = formatMonthName(monthSelect.value);
    selectedMonthIndex = -1;
    previousHistoryMonthButton.disabled = true;
    nextHistoryMonthButton.disabled = true;
    return;
  }

  monthSelect.value = availableMonths.includes(currentSelection)
    ? currentSelection
    : availableMonths[0];
  selectedMonthText.textContent = formatMonthName(monthSelect.value);
  selectedMonthIndex = availableMonths.indexOf(monthSelect.value);
  // Месяцы отсортированы от нового к старому.
  previousHistoryMonthButton.disabled =
    selectedMonthIndex >= availableMonths.length - 1;
  nextHistoryMonthButton.disabled = selectedMonthIndex <= 0;
}

function changeHistoryMonth(direction) {
  if (availableMonthKeys.length === 0) {
    return;
  }

  const newIndex = selectedMonthIndex + direction;

  if (newIndex < 0 || newIndex >= availableMonthKeys.length) {
    return;
  }

  selectedMonthIndex = newIndex;
  const selectedMonth = availableMonthKeys[selectedMonthIndex];
  monthSelect.value = selectedMonth;
  selectedMonthText.textContent = formatMonthName(selectedMonth);
  previousHistoryMonthButton.disabled =
    selectedMonthIndex >= availableMonthKeys.length - 1;
  nextHistoryMonthButton.disabled = selectedMonthIndex <= 0;
  renderShifts();
}

// Перерисовывает расчёт без закрытия окна.
function renderSalaryEstimate() {
  const shiftsForMonth = getSavedShifts().filter(
    (shift) => getMonthKey(shift.date) === monthSelect.value,
  );
  const baseRate = getBaseRate();
  const paySummary = calculateMonthPaySummary(shiftsForMonth, baseRate);

  salaryEstimateMonth.textContent = formatMonthName(monthSelect.value);
  baseRateInput.value = String(baseRate);
  salaryTotalHours.textContent = formatHoursAndMinutes(paySummary.totalMinutes);
  salaryBreakdown.replaceChildren();

  PAY_CATEGORY_ORDER.forEach((category) => {
    const minutes = paySummary.breakdown[category];

    if (minutes > 0) {
      salaryBreakdown.append(
        createSalaryBreakdownRow(category, minutes, baseRate),
      );
    }
  });

  salaryTotalAmount.textContent = formatWon(paySummary.totalAmount);
}

// Показывает примерную выплату за смены выбранного месяца.
function openSalaryEstimate() {
  renderSalaryEstimate();
  salaryEstimateOverlay.hidden = false;
  document.body.classList.add("dialog-open");
}

function closeSalaryEstimate() {
  salaryEstimateOverlay.hidden = true;
  document.body.classList.remove("dialog-open");
  document.activeElement?.blur();
  resetHistoryPosition();
}

// Возвращает историю в верхнюю позицию после закрытия всплывающего окна.
// На iPhone Safari сдвиг экрана иногда происходит не сразу, поэтому повторяем
// сброс несколько раз с небольшой задержкой.
function resetHistoryPosition() {
  const reset = () => {
    window.scrollTo(0, 0);
    historyScrollArea.scrollTop = 0;
  };

  reset();
  window.requestAnimationFrame(reset);
  window.setTimeout(reset, 120);
  window.setTimeout(reset, 320);
}

// Открывает меню действий для смены, на которую нажал пользователь.
function openShiftActions(shift) {
  selectedShiftId = shift.id;
  shiftActionsDetails.replaceChildren(createShiftDetails(shift));
  shiftActionsOverlay.hidden = false;
  document.body.classList.add("dialog-open");
  editShiftButton.focus();
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
  editingOriginalDate = null;
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

  card.append(createShiftDetails(shift));
  card.addEventListener("click", () => openShiftActions(shift));

  return card;
}

// Создаёт одинаковое содержимое смены для списка и всплывающего окна.
function createShiftDetails(shift) {
  const wrapper = document.createElement("div");

  const date = document.createElement("h2");
  date.className = "shift-card__date";
  date.textContent = formatShiftDate(shift.date);

  const details = document.createElement("div");
  details.className = "shift-card__details";

  const startRow = createTimeRow("Начало смены", shift.startTime);
  const endRow = createTimeRow("Конец смены", shift.endTime);
  const breakMinutes = getShiftBreakMinutes(shift);

  details.append(startRow, endRow);

  if (breakMinutes > 0) {
    details.append(
      createTimeRow("Перерыв", formatHoursAndMinutes(breakMinutes)),
    );
  }

  wrapper.append(date, details);
  return wrapper;
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

// Коротко показывает галочку после сохранения или текст ошибки.
function showSavedMessage(message = "") {
  window.clearTimeout(messageTimer);
  saveMessageText.textContent = message;
  saveMessage.classList.toggle("save-message--text", Boolean(message));
  saveMessage.classList.add("save-message--visible");

  messageTimer = window.setTimeout(() => {
    saveMessage.classList.remove("save-message--visible");
    saveMessage.classList.remove("save-message--text");
    saveMessageText.textContent = "";
  }, 2200);
}

// Переключает видимый раздел и выделяет активную кнопку внизу.
function showPage(pageId) {
  const targetPage = document.getElementById(pageId);

  if (!targetPage) {
    return;
  }

  if (pageId === activePageId) {
    return;
  }

  document.body.classList.toggle("home-page-active", pageId === "homePage");
  document.body.classList.toggle(
    "history-page-active",
    pageId === "calendarPage",
  );
  document.body.classList.toggle(
    "profile-page-active",
    pageId === "profilePage",
  );

  if (pageId === "calendarPage") {
    // Обновляем данные до начала анимации, чтобы экран появился уже готовым.
    renderMonthOptions();
    renderShifts();
  }

  pages.forEach((page) => {
    const isActive = page.id === pageId;

    page.classList.toggle("page--active", isActive);
    page.setAttribute("aria-hidden", String(!isActive));
    page.inert = !isActive;
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

  activePageId = pageId;
}

function showAuthForm(formName) {
  const isLogin = formName === "login";

  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  loginTabButton.classList.toggle("auth-tab--active", isLogin);
  registerTabButton.classList.toggle("auth-tab--active", !isLogin);
  loginTabButton.setAttribute("aria-selected", String(isLogin));
  registerTabButton.setAttribute("aria-selected", String(!isLogin));
  authPreviewMessage.textContent = isFirebaseConfigured
    ? ""
    : "Подключение Firebase ожидает настройки";
}

function setAuthMessage(message, isError = false) {
  authPreviewMessage.textContent = message;
  authPreviewMessage.classList.toggle("auth-preview-message--error", isError);
}

function setAuthLoading(form, isLoading) {
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading
    ? "Подождите…"
    : form === loginForm
      ? "Войти"
      : "Создать профиль";
}

function getFirebaseErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Профиль с таким email уже существует",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/invalid-email": "Проверьте правильность email",
    "auth/missing-password": "Введите пароль",
    "auth/configuration-not-found":
      "Включите Email/Password в настройках Firebase Authentication",
    "auth/operation-not-allowed":
      "Включите Email/Password в настройках Firebase Authentication",
    "auth/weak-password": "Пароль должен содержать минимум 6 символов",
    "auth/too-many-requests": "Слишком много попыток. Попробуйте позже",
    "auth/network-request-failed": "Нет соединения с интернетом",
  };

  return messages[error.code] || "Не удалось выполнить операцию";
}

function updateAccountView(user) {
  const isSignedIn = Boolean(user);

  authGuestView.hidden = isSignedIn;
  authUserView.hidden = !isSignedIn;

  if (isSignedIn) {
    accountName.textContent = user.displayName || "Пользователь";
    accountEmail.textContent = user.email || "";
    setAuthMessage("");
  } else {
    showAuthForm("login");
  }
}

function refreshShiftInterface(preferredMonth) {
  renderMonthOptions(preferredMonth);
  renderShifts();
}

async function synchronizeUserShifts(user) {
  accountSyncText.textContent = "Синхронизация данных…";

  let guestShifts = [];

  try {
    const savedGuestData = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    );
    guestShifts = Array.isArray(savedGuestData) ? savedGuestData : [];
  } catch (error) {
    // Повреждённые локальные данные не должны мешать входу в профиль.
    console.error("Не удалось прочитать локальные смены:", error);
  }

  const cloudShifts = await loadCloudShifts(user.uid);
  const mergedByDate = new Map();

  guestShifts.forEach((shift) => mergedByDate.set(shift.date, shift));
  cloudShifts.forEach((shift) => mergedByDate.set(shift.date, shift));

  const mergedShifts = [...mergedByDate.values()];
  localStorage.setItem(
    `${STORAGE_KEY}:${user.uid}`,
    JSON.stringify(mergedShifts),
  );

  const cloudDates = new Set(cloudShifts.map((shift) => shift.date));
  const shiftsToUpload = guestShifts.filter(
    (shift) => !cloudDates.has(shift.date),
  );

  await uploadCloudShifts(user.uid, shiftsToUpload);
  accountSyncText.textContent = "Данные синхронизированы";
  refreshShiftInterface();
}

async function saveShiftOnline(shift, previousDate = null) {
  if (!currentUser || !isFirebaseConfigured) {
    return;
  }

  try {
    accountSyncText.textContent = "Синхронизация данных…";

    if (previousDate && previousDate !== shift.date) {
      await deleteCloudShift(currentUser.uid, previousDate);
    }

    await saveCloudShift(currentUser.uid, shift);
    accountSyncText.textContent = "Данные синхронизированы";
  } catch (error) {
    accountSyncText.textContent = "Сохранено на устройстве";
    console.error("Не удалось синхронизировать смену:", error);
  }
}

// Сохраняет новую смену или обновляет выбранную запись.
shiftForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!startTimeInput.value || !endTimeInput.value) {
    showSavedMessage("Выберите начало и конец смены");
    return;
  }

  const lunchBreakMinutes = breakValueToMinutes(lunchBreakInput.value);
  const dinnerBreakMinutes = breakValueToMinutes(dinnerBreakInput.value);

  if (lunchBreakMinutes === null || dinnerBreakMinutes === null) {
    showSavedMessage("Выберите перерыв заново");
    return;
  }

  if (
    lunchBreakMinutes + dinnerBreakMinutes >=
    getShiftDurationMinutes({
      startTime: startTimeInput.value,
      endTime: endTimeInput.value,
    })
  ) {
    showSavedMessage("Перерывы больше смены");
    return;
  }

  const newShift = {
    id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`,
    date: shiftDateInput.value,
    startTime: startTimeInput.value,
    endTime: endTimeInput.value,
    lunchBreakMinutes,
    dinnerBreakMinutes,
  };

  const shifts = getSavedShifts();
  const wasEditing = Boolean(editingShiftId);
  const previousDate = wasEditing ? editingOriginalDate : null;
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
      lunchBreakMinutes: newShift.lunchBreakMinutes,
      dinnerBreakMinutes: newShift.dinnerBreakMinutes,
    }),
  );

  renderMonthOptions(getMonthKey(newShift.date));
  showSavedMessage();
  finishEditing();
  await saveShiftOnline(newShift, previousDate);
});

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

profileButton.addEventListener("click", () => showPage("profilePage"));
closeProfileButton.addEventListener("click", () => showPage("homePage"));
loginTabButton.addEventListener("click", () => showAuthForm("login"));
registerTabButton.addEventListener("click", () => showAuthForm("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isFirebaseConfigured) {
    setAuthMessage("Сначала добавьте конфигурацию Firebase", true);
    return;
  }

  const formData = new FormData(loginForm);
  setAuthLoading(loginForm, true);

  try {
    await loginAccount(
      formData.get("username").trim(),
      formData.get("password"),
    );
    loginForm.reset();
  } catch (error) {
    setAuthMessage(getFirebaseErrorMessage(error), true);
  } finally {
    setAuthLoading(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isFirebaseConfigured) {
    setAuthMessage("Сначала добавьте конфигурацию Firebase", true);
    return;
  }

  const formData = new FormData(registerForm);
  setAuthLoading(registerForm, true);

  try {
    await registerAccount(
      formData.get("name").trim(),
      formData.get("email").trim(),
      formData.get("new-password"),
    );
    registerForm.reset();
  } catch (error) {
    setAuthMessage(getFirebaseErrorMessage(error), true);
  } finally {
    setAuthLoading(registerForm, false);
  }
});

forgotPasswordButton.addEventListener("click", async () => {
  const email = new FormData(loginForm).get("username").trim();

  if (!email) {
    setAuthMessage("Сначала введите email", true);
    return;
  }

  if (!isFirebaseConfigured) {
    setAuthMessage("Сначала добавьте конфигурацию Firebase", true);
    return;
  }

  try {
    await resetAccountPassword(email);
    setAuthMessage("Письмо для восстановления отправлено");
  } catch (error) {
    setAuthMessage(getFirebaseErrorMessage(error), true);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await logoutAccount();
    showPage("homePage");
  } catch (error) {
    setAuthMessage("Не удалось выйти из профиля", true);
  }
});

previousHistoryMonthButton.addEventListener("click", () => {
  changeHistoryMonth(1);
});

nextHistoryMonthButton.addEventListener("click", () => {
  changeHistoryMonth(-1);
});

shiftCount.addEventListener("click", openSalaryEstimate);

baseRateInput.addEventListener("change", () => {
  setBaseRate(baseRateInput.value);
  renderSalaryEstimate();
});

salaryEstimateOverlay.addEventListener("click", (event) => {
  if (event.target === salaryEstimateOverlay) {
    closeSalaryEstimate();
  }
});

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
  editingOriginalDate = shift.date;
  shiftDateInput.value = shift.date;
  setTimeValue("start", shift.startTime);
  setTimeValue("end", shift.endTime);
  setBreakValue("lunch", shift.lunchBreakMinutes || 0);
  setBreakValue("dinner", shift.dinnerBreakMinutes || 0);
  updateSelectedDateText();
  saveButton.textContent = "Сохранить изменения";
  cancelEditButton.hidden = false;

  closeShiftActions(false);
  showPage("homePage");
});

deleteShiftButton.addEventListener("click", async () => {
  const deletedShift = getSavedShifts().find(
    (shift) => shift.id === selectedShiftId,
  );
  const remainingShifts = getSavedShifts().filter(
    (shift) => shift.id !== selectedShiftId,
  );

  saveShifts(remainingShifts);
  closeShiftActions(false);
  renderMonthOptions();
  renderShifts();
  selectedShiftId = null;

  if (currentUser && deletedShift) {
    try {
      await deleteCloudShift(currentUser.uid, deletedShift.date);
      accountSyncText.textContent = "Данные синхронизированы";
    } catch (error) {
      accountSyncText.textContent = "Удалено только на устройстве";
      console.error("Не удалось удалить смену из облака:", error);
    }
  }
});

cancelEditButton.addEventListener("click", () => {
  finishEditing();
  shiftDateInput.value = getTodayValue();
  updateSelectedDateText();
});

startTimeButton.addEventListener("click", () => openTimePicker("start"));
endTimeButton.addEventListener("click", () => openTimePicker("end"));
lunchBreakButton.addEventListener("click", () => openBreakPicker("lunch"));
dinnerBreakButton.addEventListener("click", () => openBreakPicker("dinner"));

timePickerOverlay.addEventListener("click", (event) => {
  if (event.target === timePickerOverlay) {
    closeTimePicker();
  }
});

breakPickerOverlay.addEventListener("click", (event) => {
  if (event.target === breakPickerOverlay) {
    closeBreakPicker();
  }
});

increaseHourButton.addEventListener("click", () => changeTimePart("hour", 1));
decreaseHourButton.addEventListener("click", () => changeTimePart("hour", -1));
increaseMinuteButton.addEventListener("click", () =>
  changeTimePart("minute", 1),
);
decreaseMinuteButton.addEventListener("click", () =>
  changeTimePart("minute", -1),
);
increaseBreakButton.addEventListener("click", () => changeBreakMinutes(1));
decreaseBreakButton.addEventListener("click", () => changeBreakMinutes(-1));

confirmTimeButton.addEventListener("click", () => {
  const timeValue = `${String(selectedHour).padStart(2, "0")}:${String(
    selectedMinute,
  ).padStart(2, "0")}`;

  setTimeValue(activeTimeField, timeValue);
  closeTimePicker();
});

confirmBreakButton.addEventListener("click", () => {
  setBreakValue(activeBreakField, selectedBreakMinutes);
  closeBreakPicker();
});

datePickerButton.addEventListener("click", openDatePicker);

previousShiftDateButton.addEventListener("click", () => {
  changeShiftDateByDays(-1);
});

nextShiftDateButton.addEventListener("click", () => {
  changeShiftDateByDays(1);
});

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
    } else if (!salaryEstimateOverlay.hidden) {
      closeSalaryEstimate();
    } else if (!shiftActionsOverlay.hidden) {
      closeShiftActions();
    } else if (!timePickerOverlay.hidden) {
      closeTimePicker();
    } else if (!breakPickerOverlay.hidden) {
      closeBreakPicker();
    }
  }
});

// Начальные значения при первом открытии приложения.
shiftDateInput.value = getTodayValue();
updateSelectedDateText();

// Восстанавливаем время, которое пользователь сохранял в прошлый раз.
try {
  const lastTime = JSON.parse(localStorage.getItem(LAST_TIME_KEY));

  if (lastTime) {
    setTimeValue("start", lastTime.startTime || "");
    setTimeValue("end", lastTime.endTime || "");
    setBreakValue("lunch", lastTime.lunchBreakMinutes || 0);
    setBreakValue("dinner", lastTime.dinnerBreakMinutes || 0);
  }
} catch (error) {
  console.error("Не удалось восстановить последнее время смены:", error);
}

baseRateInput.value = String(getBaseRate());

updateAccountView(null);

observeAuthState(async (user) => {
  currentUser = user;
  updateAccountView(user);

  if (!user) {
    refreshShiftInterface();
    return;
  }

  try {
    await synchronizeUserShifts(user);
  } catch (error) {
    accountSyncText.textContent = "Не удалось загрузить облачные данные";
    refreshShiftInterface();
    console.error("Ошибка загрузки Firestore:", error);
  }
});

renderMonthOptions();
renderShifts();
