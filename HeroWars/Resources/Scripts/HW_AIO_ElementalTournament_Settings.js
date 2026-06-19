// ============================================================
// HW AIO - Настройки Турнира Стихий (Elemental Tournament)
// Версия: 12.10.0
// ============================================================

(function(global) {
    'use strict';

    // ============================================================
    // КОНСТАНТЫ
    // ============================================================

    const MODULE_VERSION = '12.10.0';
    const DEBUG_KEY = 'hw_aio_debug';

    // ============================================================
    // УТИЛИТЫ ДЛЯ ЛОГИРОВАНИЯ
    // ============================================================

    function debugLog(level, ...args) {
        const isDebugEnabled = localStorage.getItem(DEBUG_KEY) === 'true';
        if (!isDebugEnabled) return;

        const consoleMethods = {
            'log': console.log,
            'warn': console.warn,
            'error': console.error,
            'info': console.info
        };

        const method = consoleMethods[level] || console.log;
        const prefix = '[HW AIO Settings]';
        method(prefix, ...args);
    }

    // ============================================================
    // НАСТРОЙКИ ПО УМОЛЧАНИЮ (DEFAULT)
    // ============================================================

    const DEFAULT_SETTINGS = {
        soundAlertEnabled: true,
        startFromPackId: null,
        testBattleCount: 5,
        finalCheckBattleCount: 50,
        finalCheckPacksCount: 5,
        testBattleCountStage8: 10,
        finalCheckBattleCountStage8: 50,
        finalCheckPacksCountStage8: 5
    };

    // ============================================================
    // ПЕРЕМЕННЫЕ СОСТОЯНИЯ
    // ============================================================

    let isSettingsModalOpen = false;
    let tempSettings = { ...DEFAULT_SETTINGS };
    let maxPackId = 0;
    let onSettingsSavedCallback = null;

    // ============================================================
    // ФУНКЦИИ ДЛЯ РАБОТЫ С НАСТРОЙКАМИ (ИЗ ОСНОВНОГО СКРИПТА)
    // ============================================================

    /**
     * Загружает настройки из cookies
     * @param {function} callback - Функция обратного вызова с настройками
     */
    function loadSettingsFromCookies(callback) {
        const match = document.cookie.match(/(?:^|;\s*)hw_defence_settings=([^;]*)/);
        if (match) {
            try {
                const settingsObj = JSON.parse(decodeURIComponent(match[1]));
                callback(settingsObj);
                return;
            } catch (e) {
                debugLog('error', 'Ошибка парсинга настроек из Cookies', e);
            }
        }
        callback(null);
    }

    /**
     * Сохраняет настройки в cookies
     * @param {Object} settingsObj - Объект с настройками
     */
    function saveSettingsToCookies(settingsObj) {
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `hw_defence_settings=${encodeURIComponent(JSON.stringify(settingsObj))}; expires=${expires}; path=/`;
    }

    // ============================================================
    // ФУНКЦИЯ ПОЛУЧЕНИЯ ТЕКУЩИХ НАСТРОЕК
    // ============================================================

    /**
     * Получает текущие настройки из основного скрипта
     * @returns {Object} - Объект с настройками
     */
    function getCurrentSettings() {
        // Пытаемся получить настройки из глобального контекста
        if (global.HW_AIO_SETTINGS) {
            return { ...global.HW_AIO_SETTINGS };
        }

        // Если нет глобальных настроек, загружаем из cookies
        let settings = { ...DEFAULT_SETTINGS };
        loadSettingsFromCookies(function(cookieSettings) {
            if (cookieSettings) {
                settings = { ...DEFAULT_SETTINGS, ...cookieSettings };
            }
        });
        return settings;
    }

    // ============================================================
    // СОЗДАНИЕ МОДАЛЬНОГО ОКНА НАСТРОЕК
    // ============================================================

    /**
     * Создаёт модальное окно настроек
     * @param {Object} options - Опции для модального окна
     * @param {number} options.maxPackId - Максимальный ID пака
     * @param {function} options.onSave - Функция обратного вызова при сохранении
     * @param {function} options.onCancel - Функция обратного вызова при отмене
     * @param {function} options.onReset - Функция обратного вызова при сбросе
     */
    function createSettingsModal(options = {}) {
        if (isSettingsModalOpen) {
            closeSettingsModal();
            return;
        }

        const {
            maxPackId: maxId = 0,
            onSave = null,
            onCancel = null,
            onReset = null
        } = options;

        maxPackId = maxId;
        onSettingsSavedCallback = onSave;

        // Получаем текущие настройки
        const currentSettings = getCurrentSettings();

        // Копируем текущие настройки во временные
        tempSettings = {
            soundAlertEnabled: currentSettings.soundAlertEnabled !== undefined ? currentSettings.soundAlertEnabled : DEFAULT_SETTINGS.soundAlertEnabled,
            startFromPackId: currentSettings.startFromPackId !== undefined ? currentSettings.startFromPackId : DEFAULT_SETTINGS.startFromPackId,
            testBattleCount: currentSettings.testBattleCount !== undefined ? currentSettings.testBattleCount : DEFAULT_SETTINGS.testBattleCount,
            finalCheckBattleCount: currentSettings.finalCheckBattleCount !== undefined ? currentSettings.finalCheckBattleCount : DEFAULT_SETTINGS.finalCheckBattleCount,
            finalCheckPacksCount: currentSettings.finalCheckPacksCount !== undefined ? currentSettings.finalCheckPacksCount : DEFAULT_SETTINGS.finalCheckPacksCount,
            testBattleCountStage8: currentSettings.testBattleCountStage8 !== undefined ? currentSettings.testBattleCountStage8 : DEFAULT_SETTINGS.testBattleCountStage8,
            finalCheckBattleCountStage8: currentSettings.finalCheckBattleCountStage8 !== undefined ? currentSettings.finalCheckBattleCountStage8 : DEFAULT_SETTINGS.finalCheckBattleCountStage8,
            finalCheckPacksCountStage8: currentSettings.finalCheckPacksCountStage8 !== undefined ? currentSettings.finalCheckPacksCountStage8 : DEFAULT_SETTINGS.finalCheckPacksCountStage8
        };

        // ========== СОЗДАНИЕ DOM ЭЛЕМЕНТОВ ==========

        const overlay = document.createElement('div');
        overlay.id = 'hw-settings-modal';

        const modal = document.createElement('div');
        modal.className = 'modal';

        // Кнопка закрытия
        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '✕';
        closeBtn.onclick = function() {
            closeSettingsModal();
            if (onCancel) onCancel();
        };

        // Заголовок
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = '⚙️ Настройки проверки ТС';

        // Контейнер полей
        const fieldsContainer = document.createElement('div');
        fieldsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px;';

        // ========== ПОЛЕ: ЗВУКОВОЕ ОПОВЕЩЕНИЕ ==========
        const soundRow = document.createElement('div');
        soundRow.className = 'sound-row';

        const soundLabelContainer = document.createElement('div');
        soundLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const soundLabel = document.createElement('span');
        soundLabel.className = 'label';
        soundLabel.textContent = '🔊 Звуковое оповещение при нахождении 100% результата';

        soundLabelContainer.appendChild(soundLabel);

        const soundCheck = document.createElement('input');
        soundCheck.type = 'checkbox';
        soundCheck.checked = tempSettings.soundAlertEnabled;

        soundRow.appendChild(soundLabelContainer);
        soundRow.appendChild(soundCheck);
        fieldsContainer.appendChild(soundRow);

        // ========== ТАБЛИЦА НАСТРОЕК ДЛЯ ЭТАПОВ ==========
        const tableLabel = document.createElement('div');
        tableLabel.style.cssText = 'color: #e8e8e8; font-weight: 600; font-size: 14px; margin-top: 4px; margin-bottom: 2px;';
        tableLabel.textContent = '📊 Настройки для этапов:';

        fieldsContainer.appendChild(tableLabel);

        // Создаём таблицу
        const table = document.createElement('table');
        table.className = 'hw-settings-table';
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';

        // Заголовок таблицы
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: #2a2a2a;';

        const th1 = document.createElement('th');
        th1.textContent = '';
        th1.style.cssText = 'padding: 6px 8px; text-align: left; color: #e8e8e8; border-bottom: 2px solid #444;';

        const th2 = document.createElement('th');
        th2.textContent = '1-7 этап';
        th2.style.cssText = 'padding: 6px 8px; text-align: center; color: #e8e8e8; border-bottom: 2px solid #444;';

        const th3 = document.createElement('th');
        th3.textContent = '8 этап';
        th3.style.cssText = 'padding: 6px 8px; text-align: center; color: #e8e8e8; border-bottom: 2px solid #444;';

        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        headerRow.appendChild(th3);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Тело таблицы
        const tbody = document.createElement('tbody');

        // Строка 1: Кол-во тестовых боёв
        const row1 = document.createElement('tr');
        row1.style.cssText = 'border-bottom: 1px solid #333;';

        const cell1_1 = document.createElement('td');
        cell1_1.textContent = 'Кол-во тестовых боёв';
        cell1_1.style.cssText = 'padding: 6px 8px; color: #d0d0d0;';

        const cell1_2 = document.createElement('td');
        cell1_2.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input1_2 = document.createElement('input');
        input1_2.type = 'number';
        input1_2.min = '1';
        input1_2.max = '99';
        input1_2.value = tempSettings.testBattleCount;
        input1_2.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input1_2.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.testBattleCount = val;
            } else {
                this.value = tempSettings.testBattleCount;
            }
        };
        cell1_2.appendChild(input1_2);

        const cell1_3 = document.createElement('td');
        cell1_3.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input1_3 = document.createElement('input');
        input1_3.type = 'number';
        input1_3.min = '1';
        input1_3.max = '99';
        input1_3.value = tempSettings.testBattleCountStage8;
        input1_3.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input1_3.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.testBattleCountStage8 = val;
            } else {
                this.value = tempSettings.testBattleCountStage8;
            }
        };
        cell1_3.appendChild(input1_3);

        row1.appendChild(cell1_1);
        row1.appendChild(cell1_2);
        row1.appendChild(cell1_3);
        tbody.appendChild(row1);

        // Строка 2: Кол-во тестовых боёв (финальная проверка)
        const row2 = document.createElement('tr');
        row2.style.cssText = 'border-bottom: 1px solid #333;';

        const cell2_1 = document.createElement('td');
        cell2_1.textContent = 'Кол-во боёв (финальная проверка)';
        cell2_1.style.cssText = 'padding: 6px 8px; color: #d0d0d0;';

        const cell2_2 = document.createElement('td');
        cell2_2.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input2_2 = document.createElement('input');
        input2_2.type = 'number';
        input2_2.min = '1';
        input2_2.max = '99';
        input2_2.value = tempSettings.finalCheckBattleCount;
        input2_2.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input2_2.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.finalCheckBattleCount = val;
            } else {
                this.value = tempSettings.finalCheckBattleCount;
            }
        };
        cell2_2.appendChild(input2_2);

        const cell2_3 = document.createElement('td');
        cell2_3.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input2_3 = document.createElement('input');
        input2_3.type = 'number';
        input2_3.min = '1';
        input2_3.max = '99';
        input2_3.value = tempSettings.finalCheckBattleCountStage8;
        input2_3.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input2_3.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.finalCheckBattleCountStage8 = val;
            } else {
                this.value = tempSettings.finalCheckBattleCountStage8;
            }
        };
        cell2_3.appendChild(input2_3);

        row2.appendChild(cell2_1);
        row2.appendChild(cell2_2);
        row2.appendChild(cell2_3);
        tbody.appendChild(row2);

        // Строка 3: Кол-во ТОП паков (финальная проверка)
        const row3 = document.createElement('tr');
        row3.style.cssText = 'border-bottom: 1px solid #333;';

        const cell3_1 = document.createElement('td');
        cell3_1.textContent = 'Кол-во ТОП паков (финальная проверка)';
        cell3_1.style.cssText = 'padding: 6px 8px; color: #d0d0d0;';

        const cell3_2 = document.createElement('td');
        cell3_2.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input3_2 = document.createElement('input');
        input3_2.type = 'number';
        input3_2.min = '0';
        input3_2.max = '20';
        input3_2.value = tempSettings.finalCheckPacksCount;
        input3_2.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input3_2.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 0) {
                tempSettings.finalCheckPacksCount = val;
            } else {
                this.value = tempSettings.finalCheckPacksCount;
            }
        };
        cell3_2.appendChild(input3_2);

        const cell3_3 = document.createElement('td');
        cell3_3.style.cssText = 'padding: 4px 8px; text-align: center;';
        const input3_3 = document.createElement('input');
        input3_3.type = 'number';
        input3_3.min = '0';
        input3_3.max = '20';
        input3_3.value = tempSettings.finalCheckPacksCountStage8;
        input3_3.style.cssText = 'width: 60px; padding: 4px 6px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; text-align: center;';
        input3_3.onchange = function () {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 0) {
                tempSettings.finalCheckPacksCountStage8 = val;
            } else {
                this.value = tempSettings.finalCheckPacksCountStage8;
            }
        };
        cell3_3.appendChild(input3_3);

        row3.appendChild(cell3_1);
        row3.appendChild(cell3_2);
        row3.appendChild(cell3_3);
        tbody.appendChild(row3);

        table.appendChild(tbody);
        fieldsContainer.appendChild(table);

        // ========== ПОЛЕ: НАЧАТЬ ПРОВЕРКУ С ПАКА ==========
        const startPackRow = document.createElement('div');
        startPackRow.className = 'settings-field';

        const startPackLabelContainer = document.createElement('div');
        startPackLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const startPackLabel = document.createElement('span');
        startPackLabel.className = 'label';
        startPackLabel.textContent = 'Начать проверку с пака:';

        startPackLabelContainer.appendChild(startPackLabel);

        const startPackInput = document.createElement('input');
        startPackInput.type = 'number';
        startPackInput.min = '1';
        startPackInput.max = maxPackId > 0 ? maxPackId : 9999;
        startPackInput.placeholder = '1';
        startPackInput.value = tempSettings.startFromPackId !== null ? tempSettings.startFromPackId : '';
        startPackInput.onchange = function () {
            const val = this.value.trim();
            const num = parseInt(val);
            if (val === '') {
                tempSettings.startFromPackId = null;
            } else if (!isNaN(num) && num >= 1) {
                tempSettings.startFromPackId = num;
            } else {
                this.value = tempSettings.startFromPackId !== null ? tempSettings.startFromPackId : '';
            }
        };

        startPackRow.appendChild(startPackLabelContainer);
        startPackRow.appendChild(startPackInput);
        fieldsContainer.appendChild(startPackRow);

        // ========== ИНФОРМАЦИОННЫЙ БЛОК ==========
        const infoBlock = document.createElement('div');
        infoBlock.className = 'info-block';
        infoBlock.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">💡</span>
                <span style="color: #e8e8e8; font-weight: 600;">Как работает проверка:</span>
            </div>
            <div style="padding-left: 20px; line-height: 1.8; color: #d0d0d0;">
                1️⃣ Сначала каждый пак проверяется N раз, где N - кол-во тестовых боёв<br>
                2️⃣ При нахождении 100% результата, производится <span class="final-check-highlight">финальная проверка</span> данного пака N раз, где N - кол-во тестовых боёв (финальная проверка)
                <br>Если <span class="final-check-highlight">финальная проверка</span> так же дала 100% результат, то проверка останавливается<br>
                3️⃣ Если после проверки всех паков 100% результат не найден, то делается <span class="final-check-highlight">финальная проверка</span> топ N лучших паков, где N - кол-во ТОП паков (финальная проверка)
            </div>
        `;

        fieldsContainer.appendChild(infoBlock);

        // ========== КНОПКА СБРОСА ==========
        const resetBtn = document.createElement('button');
        resetBtn.className = 'reset-btn';
        resetBtn.textContent = '🔄 Сбросить';
        resetBtn.onclick = function() {
            // Сбрасываем только временные настройки
            tempSettings = {
                soundAlertEnabled: DEFAULT_SETTINGS.soundAlertEnabled,
                startFromPackId: DEFAULT_SETTINGS.startFromPackId,
                testBattleCount: DEFAULT_SETTINGS.testBattleCount,
                finalCheckBattleCount: DEFAULT_SETTINGS.finalCheckBattleCount,
                finalCheckPacksCount: DEFAULT_SETTINGS.finalCheckPacksCount,
                testBattleCountStage8: DEFAULT_SETTINGS.testBattleCountStage8,
                finalCheckBattleCountStage8: DEFAULT_SETTINGS.finalCheckBattleCountStage8,
                finalCheckPacksCountStage8: DEFAULT_SETTINGS.finalCheckPacksCountStage8
            };

            // Обновляем поля в модальном окне
            soundCheck.checked = tempSettings.soundAlertEnabled;
            input1_2.value = tempSettings.testBattleCount;
            input1_3.value = tempSettings.testBattleCountStage8;
            input2_2.value = tempSettings.finalCheckBattleCount;
            input2_3.value = tempSettings.finalCheckBattleCountStage8;
            input3_2.value = tempSettings.finalCheckPacksCount;
            input3_3.value = tempSettings.finalCheckPacksCountStage8;
            startPackInput.value = tempSettings.startFromPackId !== null ? tempSettings.startFromPackId : '';

            if (onReset) onReset();
        };

        fieldsContainer.appendChild(resetBtn);

        // ========== КНОПКИ ДЕЙСТВИЙ ==========
        const buttonsRow = document.createElement('div');
        buttonsRow.className = 'buttons-row';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = '💾 Сохранить';
        saveBtn.onclick = function() {
            // Применяем временные настройки
            const finalSettings = {
                soundAlertEnabled: tempSettings.soundAlertEnabled,
                startFromPackId: tempSettings.startFromPackId,
                testBattleCount: tempSettings.testBattleCount,
                finalCheckBattleCount: tempSettings.finalCheckBattleCount,
                finalCheckPacksCount: tempSettings.finalCheckPacksCount,
                testBattleCountStage8: tempSettings.testBattleCountStage8,
                finalCheckBattleCountStage8: tempSettings.finalCheckBattleCountStage8,
                finalCheckPacksCountStage8: tempSettings.finalCheckPacksCountStage8
            };

            // Сохраняем в cookies
            saveSettingsToCookies(finalSettings);

            // Обновляем глобальные настройки, если они есть
            if (global.HW_AIO_SETTINGS) {
                Object.assign(global.HW_AIO_SETTINGS, finalSettings);
            }

            // Вызываем колбэк сохранения
            if (onSettingsSavedCallback) {
                onSettingsSavedCallback(finalSettings);
            }

            // Закрываем окно
            closeSettingsModal();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Отмена';
        cancelBtn.onclick = function() {
            closeSettingsModal();
            if (onCancel) onCancel();
        };

        buttonsRow.appendChild(saveBtn);
        buttonsRow.appendChild(cancelBtn);

        // ========== СБОРКА МОДАЛЬНОГО ОКНА ==========

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(fieldsContainer);
        modal.appendChild(buttonsRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        isSettingsModalOpen = true;

        // Закрытие по клику на оверлей
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                closeSettingsModal();
                if (onCancel) onCancel();
            }
        };

        // Закрытие по Escape
        const onEscape = function(e) {
            if (e.key === 'Escape' && isSettingsModalOpen) {
                closeSettingsModal();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', onEscape);
            }
        };
        document.addEventListener('keydown', onEscape);

        debugLog('log', '✅ Модальное окно настроек открыто');
    }

    // ============================================================
    // ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
    // ============================================================

    function closeSettingsModal() {
        const modal = document.getElementById('hw-settings-modal');
        if (modal) {
            modal.remove();
            isSettingsModalOpen = false;
            debugLog('log', '✅ Модальное окно настроек закрыто');
        }
    }

    // ============================================================
    // ПРОВЕРКА, ОТКРЫТО ЛИ МОДАЛЬНОЕ ОКНО
    // ============================================================

    function isSettingsOpen() {
        return isSettingsModalOpen;
    }

    // ============================================================
    // ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНЫЙ ОБЪЕКТ
    // ============================================================

    global.HW_AIO_SettingsModal = {
        create: createSettingsModal,
        close: closeSettingsModal,
        isOpen: isSettingsOpen,
        version: MODULE_VERSION,
        DEFAULT_SETTINGS: DEFAULT_SETTINGS
    };

    // Для совместимости со старым названием
    global.HW_AIO_Settings = global.HW_AIO_SettingsModal;

    debugLog('log', `✅ Модуль настроек загружен (v${MODULE_VERSION})`);

})(typeof window !== 'undefined' ? window : this);