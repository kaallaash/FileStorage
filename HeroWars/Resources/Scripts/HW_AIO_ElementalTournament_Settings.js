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

    function isDebugEnabled() {
        return localStorage.getItem(DEBUG_KEY) === 'true';
    }

    // ============================================================
    // НАСТРОЙКИ ПО УМОЛЧАНИЮ (DEFAULT)
    // ============================================================

    const DEFAULT_SETTINGS = {
        soundAlertEnabled: true,
        startFromPackId: null,
        testBattleCount: 5,
        finalCheckBattleCount: 50,
        finalCheckPacksCount: 5
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
    // СОЗДАНИЕ ТУЛТИПА (ВСПЛЫВАЮЩАЯ ПОДСКАЗКА)
    // ============================================================

    function createTooltip(text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'hw-tooltip';
        tooltip.textContent = text;
        return tooltip;
    }

    function createInfoIcon(tooltipText) {
        const container = document.createElement('span');
        container.className = 'hw-info-icon';

        const icon = document.createElement('span');
        icon.className = 'hw-info-icon-sign';
        icon.textContent = 'ⓘ';

        const tooltip = createTooltip(tooltipText);

        container.appendChild(icon);
        container.appendChild(tooltip);

        // Показываем тултип при наведении
        container.addEventListener('mouseenter', function() {
            tooltip.classList.add('visible');
            icon.classList.add('active');
        });

        container.addEventListener('mouseleave', function() {
            tooltip.classList.remove('visible');
            icon.classList.remove('active');
        });

        // Для мобильных устройств - показываем по клику
        container.addEventListener('click', function(e) {
            e.stopPropagation();
            tooltip.classList.toggle('visible');
            icon.classList.toggle('active');
        });

        return container;
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
            finalCheckPacksCount: currentSettings.finalCheckPacksCount !== undefined ? currentSettings.finalCheckPacksCount : DEFAULT_SETTINGS.finalCheckPacksCount
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
        title.textContent = '⚙️ Настройки проверки';

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
        soundLabel.textContent = '🔊 Звуковое оповещение при 100%';

        soundLabelContainer.appendChild(soundLabel);

        const soundCheck = document.createElement('input');
        soundCheck.type = 'checkbox';
        soundCheck.checked = tempSettings.soundAlertEnabled;

        soundRow.appendChild(soundLabelContainer);
        soundRow.appendChild(soundCheck);
        fieldsContainer.appendChild(soundRow);

        // ========== ПОЛЕ: КОЛИЧЕСТВО ТЕСТОВЫХ БОЁВ ==========
        const battleRow = document.createElement('div');
        battleRow.className = 'settings-field';

        const battleLabelContainer = document.createElement('div');
        battleLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const battleLabel = document.createElement('span');
        battleLabel.className = 'label';
        battleLabel.textContent = 'Кол-во тестовых боёв:';

        const battleInfo = createInfoIcon(
            'Количество боёв для первичной проверки каждого пака.\n\n' +
            'Рекомендуемое значение: 5-10 боёв'
        );

        battleLabelContainer.appendChild(battleInfo);
        battleLabelContainer.appendChild(battleLabel);

        const battleInput = document.createElement('input');
        battleInput.type = 'number';
        battleInput.min = '1';
        battleInput.max = '99';
        battleInput.value = tempSettings.testBattleCount;
        battleInput.onchange = function() {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.testBattleCount = val;
            } else {
                this.value = tempSettings.testBattleCount;
            }
        };

        battleRow.appendChild(battleLabelContainer);
        battleRow.appendChild(battleInput);
        fieldsContainer.appendChild(battleRow);

        // ========== ПОЛЕ: КОЛИЧЕСТВО ТЕСТОВЫХ БОЁВ (ФИНАЛЬНАЯ ПРОВЕРКА) ==========
        const finalBattleRow = document.createElement('div');
        finalBattleRow.className = 'settings-field';

        const finalBattleLabelContainer = document.createElement('div');
        finalBattleLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const finalBattleLabel = document.createElement('span');
        finalBattleLabel.className = 'label';
        finalBattleLabel.textContent = 'Кол-во тестовых боёв (финальная проверка):';

        const finalBattleInfo = createInfoIcon(
            'При нахождении пака с 100% результатом, производится финальная проверка\n' +
            'данного пака с указанным количеством боёв.\n\n' +
            'Если финальная проверка так же дала 100% результат, то проверка останавливается.\n\n' +
            'Рекомендуемое значение: 50-100 боёв'
        );

        finalBattleLabelContainer.appendChild(finalBattleInfo);
        finalBattleLabelContainer.appendChild(finalBattleLabel);

        const finalBattleInput = document.createElement('input');
        finalBattleInput.type = 'number';
        finalBattleInput.min = '1';
        finalBattleInput.max = '99';
        finalBattleInput.value = tempSettings.finalCheckBattleCount;
        finalBattleInput.onchange = function() {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 1) {
                tempSettings.finalCheckBattleCount = val;
            } else {
                this.value = tempSettings.finalCheckBattleCount;
            }
        };

        finalBattleRow.appendChild(finalBattleLabelContainer);
        finalBattleRow.appendChild(finalBattleInput);
        fieldsContainer.appendChild(finalBattleRow);

        // ========== ПОЛЕ: КОЛИЧЕСТВО ТОП ПАКОВ (ФИНАЛЬНАЯ ПРОВЕРКА) ==========
        const finalPacksRow = document.createElement('div');
        finalPacksRow.className = 'settings-field';

        const finalPacksLabelContainer = document.createElement('div');
        finalPacksLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const finalPacksLabel = document.createElement('span');
        finalPacksLabel.className = 'label';
        finalPacksLabel.textContent = 'Кол-во ТОП паков (финальная проверка):';

        const finalPacksInfo = createInfoIcon(
            'Если после проверки всех паков 100% результат не найден,\n' +
            'делается проверка топ N лучших паков.\n\n' +
            '0 = отключить финальную проверку\n' +
            '3-5 = рекомендуется'
        );

        finalPacksLabelContainer.appendChild(finalPacksInfo);
        finalPacksLabelContainer.appendChild(finalPacksLabel);

        const finalPacksInput = document.createElement('input');
        finalPacksInput.type = 'number';
        finalPacksInput.min = '0';
        finalPacksInput.max = '20';
        finalPacksInput.value = tempSettings.finalCheckPacksCount;
        finalPacksInput.onchange = function() {
            const val = parseInt(this.value);
            if (!isNaN(val) && val >= 0) {
                tempSettings.finalCheckPacksCount = val;
            } else {
                this.value = tempSettings.finalCheckPacksCount;
            }
        };

        finalPacksRow.appendChild(finalPacksLabelContainer);
        finalPacksRow.appendChild(finalPacksInput);
        fieldsContainer.appendChild(finalPacksRow);

        // ========== ПОЛЕ: НАЧАТЬ С ПАКА ==========
        const startPackRow = document.createElement('div');
        startPackRow.className = 'settings-field';

        const startPackLabelContainer = document.createElement('div');
        startPackLabelContainer.style.cssText = 'display: flex; align-items: center;';

        const startPackLabel = document.createElement('span');
        startPackLabel.className = 'label';
        startPackLabel.textContent = 'Начать с пака:';

        const startPackInfo = createInfoIcon(
            'ID пака, с которого нужно начать проверку.\n\n' +
            'Оставьте пустым для проверки всех паков'
        );

        startPackLabelContainer.appendChild(startPackInfo);
        startPackLabelContainer.appendChild(startPackLabel);

        const startPackInput = document.createElement('input');
        startPackInput.type = 'number';
        startPackInput.min = '1';
        startPackInput.max = maxPackId > 0 ? maxPackId : 9999;
        startPackInput.placeholder = 'Все';
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
                finalCheckPacksCount: DEFAULT_SETTINGS.finalCheckPacksCount
            };

            // Обновляем поля в модальном окне
            soundCheck.checked = tempSettings.soundAlertEnabled;
            battleInput.value = tempSettings.testBattleCount;
            finalBattleInput.value = tempSettings.finalCheckBattleCount;
            finalPacksInput.value = tempSettings.finalCheckPacksCount;
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
                finalCheckPacksCount: tempSettings.finalCheckPacksCount
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