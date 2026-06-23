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
const hourValue = document.querySelector("#hourValue");
const minuteValue = document.querySelector("#minuteValue");
const increaseHourButton = document.querySelector("#increaseHourButton");
const decreaseHourButton = document.querySelector("#decreaseHourButton");
const increaseMinuteButton = document.querySelector("#increaseMinuteButton");
const decreaseMinuteButton = document.querySelector("#decreaseMinuteButton");
const confirmTimeButton = document.querySelector("#confirmTimeButton");
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
const shiftActionsTitle = document.querySelector("#shiftActionsTitle");
const shiftActionsTime = document.querySelector("#shiftActionsTime");
const closeShiftActionsButton = document.querySelector(
  "#closeShiftActionsButton",
);
const editShiftButton = document.querySelector("#editShiftButton");
const deleteShiftButton = document.querySelector("#deleteShiftButton");
const salaryEstimateOverlay = document.querySelector(
  "#salaryEstimateOverlay",
);
const closeSalaryEstimateButton = document.querySelector(
  "#closeSalaryEstimateButton",
);
const salaryEstimateMonth = document.querySelector("#salaryEstimateMonth");
const salaryTotalHours = document.querySelector("#salaryTotalHours");
const salaryFormula = document.querySelector("#salaryFormula");
const salaryTotalAmount = document.querySelector("#salaryTotalAmount");
const shiftList = document.querySelector("#shiftList");
const emptyState = document.querySelector("#emptyState");
const shiftCount = document.querySelector("#shiftCount");
const navigationButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");
const pageOrder = {
  homePage: 0,
  calendarPage: 1,
  profilePage: 2,
};

let messageTimer;
let activePageId = "homePage";
let currentUser = null;
let visibleCalendarMonth = new Date();
let selectedShiftId = null;
let editingShiftId = null;
let editingOriginalDate = null;
let activeTimeField = null;
let selectedHour = 0;
let selectedMinute = 0;
let availableMonthKeys = [];
let selectedMonthIndex = 0;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeTracking = false;

const HOURLY_RATE = 10320;

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
  timePickerTitle.textContent =
    fieldName === "start" ? "Начало смены" : "Конец смены";
  timePickerOverlay.hidden = false;
  document.body.classList.add("dialog-open");

  const activeButton =
    fieldName === "start" ? startTimeButton : endTimeButton;
  activeButton.setAttribute("aria-expanded", "true");

  renderTimeStepper();

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

function formatDecimalHours(totalMinutes) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(totalMinutes / 60);
}

function formatWon(amount) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₩`;
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

// Показывает примерную выплату за смены выбранного месяца.
function openSalaryEstimate() {
  const shiftsForMonth = getSavedShifts().filter(
    (shift) => getMonthKey(shift.date) === monthSelect.value,
  );
  const totalMinutes = shiftsForMonth.reduce(
    (sum, shift) => sum + getShiftDurationMinutes(shift),
    0,
  );
  const estimatedAmount = Math.round((totalMinutes * HOURLY_RATE) / 60);

  salaryEstimateMonth.textContent = formatMonthName(monthSelect.value);
  salaryTotalHours.textContent = formatHoursAndMinutes(totalMinutes);
  salaryFormula.textContent = `${formatDecimalHours(
    totalMinutes,
  )} × ${formatWon(HOURLY_RATE)} = ${formatWon(estimatedAmount)}`;
  salaryTotalAmount.textContent = formatWon(estimatedAmount);
  salaryEstimateOverlay.hidden = false;
  document.body.classList.add("dialog-open");
  closeSalaryEstimateButton.focus();
}

function closeSalaryEstimate() {
  salaryEstimateOverlay.hidden = true;
  document.body.classList.remove("dialog-open");
  shiftCount.focus();
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
  if (!(pageId in pageOrder)) {
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

  const activePageIndex = pageOrder[pageId];

  pages.forEach((page) => {
    const isActive = page.id === pageId;
    const pageIndex = pageOrder[page.id];

    page.classList.toggle("page--active", isActive);
    page.classList.toggle("page--left", !isActive && pageIndex < activePageIndex);
    page.classList.toggle("page--right", !isActive && pageIndex > activePageIndex);
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

  const newShift = {
    id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`,
    date: shiftDateInput.value,
    startTime: startTimeInput.value,
    endTime: endTimeInput.value,
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

// Переключение разделов горизонтальным свайпом.
document.querySelector(".app-content").addEventListener(
  "touchstart",
  (event) => {
    if (document.body.classList.contains("dialog-open")) {
      return;
    }

    const touch = event.changedTouches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeTracking = true;
  },
  { passive: true },
);

document.querySelector(".app-content").addEventListener(
  "touchend",
  (event) => {
    if (!swipeTracking) {
      return;
    }

    swipeTracking = false;
    const touch = event.changedTouches[0];
    const horizontalDistance = touch.clientX - swipeStartX;
    const verticalDistance = touch.clientY - swipeStartY;
    const isHorizontalSwipe =
      Math.abs(horizontalDistance) >= 60 &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.35;

    if (!isHorizontalSwipe) {
      return;
    }

    if (horizontalDistance < 0 && activePageId === "homePage") {
      showPage("calendarPage");
    } else if (horizontalDistance > 0 && activePageId !== "homePage") {
      showPage("homePage");
    }
  },
  { passive: true },
);

previousHistoryMonthButton.addEventListener("click", () => {
  changeHistoryMonth(1);
});

nextHistoryMonthButton.addEventListener("click", () => {
  changeHistoryMonth(-1);
});

shiftCount.addEventListener("click", openSalaryEstimate);
closeSalaryEstimateButton.addEventListener("click", closeSalaryEstimate);

salaryEstimateOverlay.addEventListener("click", (event) => {
  if (event.target === salaryEstimateOverlay) {
    closeSalaryEstimate();
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
  editingOriginalDate = shift.date;
  shiftDateInput.value = shift.date;
  setTimeValue("start", shift.startTime);
  setTimeValue("end", shift.endTime);
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

closeTimePickerButton.addEventListener("click", () => closeTimePicker());

timePickerOverlay.addEventListener("click", (event) => {
  if (event.target === timePickerOverlay) {
    closeTimePicker();
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

confirmTimeButton.addEventListener("click", () => {
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
    } else if (!salaryEstimateOverlay.hidden) {
      closeSalaryEstimate();
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
