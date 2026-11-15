(() => {
  'use strict';

  const STORAGE_KEY = 'fitlog_data_v1';

  const WORKOUT_CATEGORIES = [
    { id: '가슴', label: '가슴', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
    { id: '등', label: '등', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
    { id: '하체', label: '하체', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
    { id: '어깨', label: '어깨', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
    { id: '팔', label: '팔', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' },
    { id: '유산소/러닝', label: '유산소/러닝', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
    { id: '코어/기타', label: '코어/기타', color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
  ];

  const MEAL_TYPES = ['아침', '점심', '저녁', '간식/보충제'];

  const DEFAULT_GOALS = {
    calories: 2200,
    carbs: 250,
    protein: 150,
    fat: 70
  };

  // ==================== Date Utilities (Local Timezone Safe) ====================
  function formatLocalDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftDate(dateStr, deltaDays) {
    const dt = parseLocalDate(dateStr);
    dt.setDate(dt.getDate() + deltaDays);
    return formatLocalDate(dt);
  }

  function formatDisplayDate(dateStr) {
    const dt = parseLocalDate(dateStr);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = weekdays[dt.getDay()];
    return `${dateStr} (${dayName})`;
  }

  function getTodayStr() {
    return formatLocalDate(new Date());
  }

  // ==================== Storage & State ====================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
          goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
          theme: parsed.theme || getPreferredTheme()
        };
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return {
      days: {},
      goals: { ...DEFAULT_GOALS },
      theme: getPreferredTheme()
    };
  }

  function getPreferredTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast('저장 공간이 부족하여 데이터를 저장하지 못했습니다.');
    }
  }

  function getDayData(dateStr) {
    if (!state.days[dateStr]) {
      state.days[dateStr] = { workouts: [], diets: [] };
    }
    if (!Array.isArray(state.days[dateStr].workouts)) state.days[dateStr].workouts = [];
    if (!Array.isArray(state.days[dateStr].diets)) state.days[dateStr].diets = [];
    return state.days[dateStr];
  }

  let state = loadState();
  let currentDate = getTodayStr();
  let activeTab = 'workout'; // 'workout' | 'diet'
  let selectedCategory = WORKOUT_CATEGORIES[0].id;
  let selectedMeal = MEAL_TYPES[0];
  let matchedPrevWorkout = null;
  let matchedPrevFood = null;

  // ==================== DOM Elements ====================
  const el = {
    btnToday: document.getElementById('btn-today'),
    btnTheme: document.getElementById('btn-theme'),
    btnSettings: document.getElementById('btn-settings'),
    btnPrevDay: document.getElementById('btn-prev-day'),
    btnNextDay: document.getElementById('btn-next-day'),
    datePicker: document.getElementById('date-picker'),
    dateDisplay: document.getElementById('date-display'),

    tabWorkout: document.getElementById('tab-workout'),
    tabDiet: document.getElementById('tab-diet'),
    navWorkout: document.getElementById('nav-workout'),
    navDiet: document.getElementById('nav-diet'),

    // Workout
    workoutStatExercises: document.getElementById('workout-stat-exercises'),
    workoutStatSets: document.getElementById('workout-stat-sets'),
    workoutStatVolume: document.getElementById('workout-stat-volume'),
    workoutForm: document.getElementById('workout-form'),
    workoutCategories: document.getElementById('workout-categories'),
    workoutName: document.getElementById('workout-name'),
    workoutNameSuggestions: document.getElementById('workout-name-suggestions'),
    workoutWeight: document.getElementById('workout-weight'),
    workoutReps: document.getElementById('workout-reps'),
    workoutSets: document.getElementById('workout-sets'),
    prevRecordBanner: document.getElementById('prev-record-banner'),
    prevRecordText: document.getElementById('prev-record-text'),
    btnApplyPrev: document.getElementById('btn-apply-prev'),
    btnWorkoutPrevLookup: document.getElementById('btn-workout-prev-lookup'),
    workoutList: document.getElementById('workout-list'),

    // Diet
    btnEditGoals: document.getElementById('btn-edit-goals'),
    dietCalCurrent: document.getElementById('diet-cal-current'),
    dietCalGoal: document.getElementById('diet-cal-goal'),
    dietCalBar: document.getElementById('diet-cal-bar'),
    dietCalStatus: document.getElementById('diet-cal-status'),
    dietCarbsCurrent: document.getElementById('diet-carbs-current'),
    dietCarbsGoal: document.getElementById('diet-carbs-goal'),
    dietCarbsBar: document.getElementById('diet-carbs-bar'),
    dietProteinCurrent: document.getElementById('diet-protein-current'),
    dietProteinGoal: document.getElementById('diet-protein-goal'),
    dietProteinBar: document.getElementById('diet-protein-bar'),
    dietFatCurrent: document.getElementById('diet-fat-current'),
    dietFatGoal: document.getElementById('diet-fat-goal'),
    dietFatBar: document.getElementById('diet-fat-bar'),

    dietForm: document.getElementById('diet-form'),
    dietMeals: document.getElementById('diet-meals'),
    dietName: document.getElementById('diet-name'),
    dietNameSuggestions: document.getElementById('diet-name-suggestions'),
    prevFoodBanner: document.getElementById('prev-food-banner'),
    prevFoodText: document.getElementById('prev-food-text'),
    btnApplyPrevFood: document.getElementById('btn-apply-prev-food'),
    dietCalories: document.getElementById('diet-calories'),
    dietCarbs: document.getElementById('diet-carbs'),
    dietProtein: document.getElementById('diet-protein'),
    dietFat: document.getElementById('diet-fat'),
    dietList: document.getElementById('diet-list'),

    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    goalsForm: document.getElementById('goals-form'),
    goalCalories: document.getElementById('goal-calories'),
    goalCarbs: document.getElementById('goal-carbs'),
    goalProtein: document.getElementById('goal-protein'),
    goalFat: document.getElementById('goal-fat'),
    btnExportJson: document.getElementById('btn-export-json'),
    inputImportJson: document.getElementById('input-import-json'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnClearAll: document.getElementById('btn-clear-all'),

    toast: document.getElementById('toast')
  };

  // ==================== Helpers ====================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 2400);
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function getCategoryStyle(catId) {
    const found = WORKOUT_CATEGORIES.find((c) => c.id === catId);
    return found ? found.color : WORKOUT_CATEGORIES[WORKOUT_CATEGORIES.length - 1].color;
  }

  // ==================== Theme ====================
  function applyTheme() {
    const isDark = state.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    el.btnTheme.innerHTML = isDark
      ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
  }

  // ==================== Navigation & Date ====================
  function setDate(dateStr) {
    currentDate = dateStr;
    el.datePicker.value = dateStr;
    el.dateDisplay.textContent = formatDisplayDate(dateStr);
    el.btnToday.classList.toggle('hidden', dateStr === getTodayStr());
    renderAll();
    updatePrevWorkoutLookup();
  }

  function setTab(tab) {
    activeTab = tab;
    const isWorkout = tab === 'workout';
    el.tabWorkout.classList.toggle('hidden', !isWorkout);
    el.tabDiet.classList.toggle('hidden', isWorkout);

    el.navWorkout.className = isWorkout
      ? 'flex flex-col items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold transition'
      : 'flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 font-medium transition';

    el.navDiet.className = !isWorkout
      ? 'flex flex-col items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold transition'
      : 'flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-500 font-medium transition';
  }

  // ==================== Previous Record Lookup ====================
  function findPreviousWorkout(name, referenceDate) {
    const target = name.trim().toLowerCase();
    if (!target) return null;

    const allDates = Object.keys(state.days).sort().reverse();
    const earlierDates = allDates.filter((d) => d < referenceDate);
    const otherDates = allDates.filter((d) => d > referenceDate);
    const searchOrder = [...earlierDates, ...otherDates];

    for (const d of searchOrder) {
      const workouts = state.days[d]?.workouts || [];
      for (let i = workouts.length - 1; i >= 0; i--) {
        if (workouts[i].name.trim().toLowerCase() === target) {
          return { date: d, workout: workouts[i] };
        }
      }
    }
    return null;
  }

  function findPreviousFood(name, referenceDate) {
    const target = name.trim().toLowerCase();
    if (!target) return null;

    const allDates = Object.keys(state.days).sort().reverse();
    const searchOrder = [referenceDate, ...allDates.filter((d) => d !== referenceDate)];

    for (const d of searchOrder) {
      const diets = state.days[d]?.diets || [];
      for (let i = diets.length - 1; i >= 0; i--) {
        if (diets[i].name.trim().toLowerCase() === target) {
          return { date: d, food: diets[i] };
        }
      }
    }
    return null;
  }

  function updatePrevWorkoutLookup() {
    const name = el.workoutName.value;
    matchedPrevWorkout = findPreviousWorkout(name, currentDate);
    if (matchedPrevWorkout) {
      const { date, workout } = matchedPrevWorkout;
      const firstSet = workout.sets[0] || { weight: 0, reps: 0 };
      el.prevRecordText.textContent = `(${date}) ${firstSet.weight}kg × ${firstSet.reps}회 × ${workout.sets.length}세트`;
      el.prevRecordBanner.classList.remove('hidden');
      el.btnWorkoutPrevLookup.classList.remove('hidden');
    } else {
      el.prevRecordBanner.classList.add('hidden');
      el.btnWorkoutPrevLookup.classList.add('hidden');
    }
  }

  function applyPreviousWorkout() {
    if (!matchedPrevWorkout) return;
    const { workout } = matchedPrevWorkout;
    const firstSet = workout.sets[0] || { weight: 0, reps: 10 };
    selectedCategory = workout.category || selectedCategory;
    renderCategoryPills();
    el.workoutWeight.value = firstSet.weight;
    el.workoutReps.value = firstSet.reps;
    el.workoutSets.value = workout.sets.length || 3;
    showToast('이전 운동 기록을 불러왔습니다.');
  }

  function updatePrevFoodLookup() {
    const name = el.dietName.value;
    matchedPrevFood = findPreviousFood(name, currentDate);
    if (matchedPrevFood) {
      const { food } = matchedPrevFood;
      el.prevFoodText.textContent = `${food.calories}kcal (탄${food.carbs} · 단${food.protein} · 지${food.fat}g)`;
      el.prevFoodBanner.classList.remove('hidden');
    } else {
      el.prevFoodBanner.classList.add('hidden');
    }
  }

  function applyPreviousFood() {
    if (!matchedPrevFood) return;
    const { food } = matchedPrevFood;
    el.dietCalories.value = food.calories;
    el.dietCarbs.value = food.carbs;
    el.dietProtein.value = food.protein;
    el.dietFat.value = food.fat;
    showToast('최근 음식 영양정보를 불러왔습니다.');
  }

  function updateSuggestions() {
    const workoutNames = new Set();
    const foodNames = new Set();
    Object.values(state.days).forEach((day) => {
      (day.workouts || []).forEach((w) => workoutNames.add(w.name));
      (day.diets || []).forEach((d) => foodNames.add(d.name));
    });

    el.workoutNameSuggestions.innerHTML = Array.from(workoutNames)
      .map((n) => `<option value="${escapeHtml(n)}"></option>`)
      .join('');

    el.dietNameSuggestions.innerHTML = Array.from(foodNames)
      .map((n) => `<option value="${escapeHtml(n)}"></option>`)
      .join('');
  }

  // ==================== Render Workout ====================
  function renderCategoryPills() {
    el.workoutCategories.innerHTML = WORKOUT_CATEGORIES.map((cat) => {
      const active = cat.id === selectedCategory;
      return `
        <button type="button" data-cat="${escapeHtml(cat.id)}"
          class="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            active
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }">
          ${escapeHtml(cat.label)}
        </button>
      `;
    }).join('');
  }

  function renderWorkouts() {
    const day = getDayData(currentDate);
    const workouts = day.workouts;

    // Summary stats
    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;

    workouts.forEach((w) => {
      (w.sets || []).forEach((s) => {
        totalSets += 1;
        if (s.completed) {
          completedSets += 1;
          totalVolume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
        }
      });
    });

    el.workoutStatExercises.textContent = `${workouts.length}개`;
    el.workoutStatSets.textContent = `${completedSets} / ${totalSets}`;
    el.workoutStatVolume.textContent = `${totalVolume.toLocaleString()} kg`;

    if (workouts.length === 0) {
      el.workoutList.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">이 날 기록된 운동이 없습니다.</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">위 폼에서 오늘의 운동을 추가해 보세요!</p>
        </div>
      `;
      return;
    }

    el.workoutList.innerHTML = workouts.map((w) => {
      const sets = w.sets || [];
      const doneCount = sets.filter((s) => s.completed).length;
      const allDone = sets.length > 0 && doneCount === sets.length;
      const prev = findPreviousWorkout(w.name, currentDate);
      const prevBadge = prev
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">지난번(${prev.date.slice(5)}): ${(prev.workout.sets[0]?.weight ?? 0)}kg×${(prev.workout.sets[0]?.reps ?? 0)}회</span>`
        : '';

      const setsHtml = sets.map((s, idx) => `
        <div class="flex items-center gap-2 py-1.5 px-2 rounded-xl ${s.completed ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : 'bg-slate-50 dark:bg-slate-800/60'} transition">
          <label class="flex items-center gap-2 cursor-pointer select-none min-w-[3.5rem]">
            <input type="checkbox" data-action="toggle-set" data-wid="${w.id}" data-sidx="${idx}" ${s.completed ? 'checked' : ''}
              class="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer" />
            <span class="text-xs font-semibold ${s.completed ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}">${idx + 1}세트</span>
          </label>

          <div class="flex items-center gap-1 flex-1 justify-end">
            <input type="number" step="0.5" min="0" value="${s.weight}" data-action="edit-set" data-field="weight" data-wid="${w.id}" data-sidx="${idx}"
              class="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-semibold tabular-nums" />
            <span class="text-[11px] text-slate-400">kg</span>
            <span class="text-slate-300 dark:text-slate-600 mx-0.5">×</span>
            <input type="number" min="1" value="${s.reps}" data-action="edit-set" data-field="reps" data-wid="${w.id}" data-sidx="${idx}"
              class="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-center font-semibold tabular-nums" />
            <span class="text-[11px] text-slate-400">회</span>
          </div>

          ${sets.length > 1 ? `
            <button type="button" data-action="remove-set" data-wid="${w.id}" data-sidx="${idx}" aria-label="세트 삭제"
              class="p-1 text-slate-400 hover:text-rose-500 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
              </svg>
            </button>
          ` : '<div class="w-6"></div>'}
        </div>
      `).join('');

      return `
        <article class="bg-white dark:bg-slate-900 rounded-2xl p-4 border ${allDone ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${getCategoryStyle(w.category)}">${escapeHtml(w.category)}</span>
                <h3 class="text-sm font-bold ${allDone ? 'text-indigo-600 dark:text-indigo-400' : ''}">${escapeHtml(w.name)}</h3>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-medium ${allDone ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}">${doneCount} / ${sets.length} 세트 완료</span>
                ${prevBadge}
              </div>
            </div>
            <button type="button" data-action="delete-workout" data-wid="${w.id}" aria-label="운동 삭제"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div class="space-y-1.5">
            ${setsHtml}
          </div>

          <button type="button" data-action="add-set" data-wid="${w.id}"
            class="w-full py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            + 세트 추가
          </button>
        </article>
      `;
    }).join('');
  }

  // ==================== Render Diet ====================
  function renderMealPills() {
    el.dietMeals.innerHTML = MEAL_TYPES.map((meal) => {
      const active = meal === selectedMeal;
      return `
        <button type="button" data-meal="${escapeHtml(meal)}"
          class="py-1.5 px-2 rounded-xl text-xs font-semibold transition truncate ${
            active
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }">
          ${escapeHtml(meal)}
        </button>
      `;
    }).join('');
  }

  function renderDiets() {
    const day = getDayData(currentDate);
    const diets = day.diets;
    const goals = state.goals;

    const totals = diets.reduce(
      (acc, d) => {
        acc.calories += Number(d.calories) || 0;
        acc.carbs += Number(d.carbs) || 0;
        acc.protein += Number(d.protein) || 0;
        acc.fat += Number(d.fat) || 0;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    const calPct = Math.min(100, Math.round((totals.calories / (goals.calories || 1)) * 100));
    const carbsPct = Math.min(100, Math.round((totals.carbs / (goals.carbs || 1)) * 100));
    const proteinPct = Math.min(100, Math.round((totals.protein / (goals.protein || 1)) * 100));
    const fatPct = Math.min(100, Math.round((totals.fat / (goals.fat || 1)) * 100));

    el.dietCalCurrent.textContent = Math.round(totals.calories).toLocaleString();
    el.dietCalGoal.textContent = goals.calories.toLocaleString();
    el.dietCalBar.style.width = `${calPct}%`;
    el.dietCalBar.className = totals.calories > goals.calories
      ? 'h-full bg-rose-500 rounded-full transition-all duration-300'
      : 'h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300';

    const calDiff = Math.round(goals.calories - totals.calories);
    el.dietCalStatus.textContent = calDiff >= 0
      ? `목표까지 ${calDiff.toLocaleString()} kcal 남음 (${Math.round((totals.calories / (goals.calories || 1)) * 100)}%)`
      : `목표보다 ${Math.abs(calDiff).toLocaleString()} kcal 초과`;

    el.dietCarbsCurrent.textContent = Number(totals.carbs.toFixed(1));
    el.dietCarbsGoal.textContent = goals.carbs;
    el.dietCarbsBar.style.width = `${carbsPct}%`;

    el.dietProteinCurrent.textContent = Number(totals.protein.toFixed(1));
    el.dietProteinGoal.textContent = goals.protein;
    el.dietProteinBar.style.width = `${proteinPct}%`;

    el.dietFatCurrent.textContent = Number(totals.fat.toFixed(1));
    el.dietFatGoal.textContent = goals.fat;
    el.dietFatBar.style.width = `${fatPct}%`;

    if (diets.length === 0) {
      el.dietList.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">이 날 기록된 식단이 없습니다.</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">위 폼에서 오늘 먹은 음식을 추가해 보세요!</p>
        </div>
      `;
      return;
    }

    el.dietList.innerHTML = MEAL_TYPES.map((meal) => {
      const items = diets.filter((d) => d.meal === meal);
      if (items.length === 0) return '';

      const mealCal = items.reduce((sum, i) => sum + (Number(i.calories) || 0), 0);
      const itemsHtml = items.map((item) => `
        <div class="flex items-center justify-between gap-2 py-2.5 border-t border-slate-100 dark:border-slate-800 first:border-t-0">
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate">${escapeHtml(item.name)}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              탄 ${item.carbs}g · 단 ${item.protein}g · 지 ${item.fat}g
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">${Math.round(item.calories)} kcal</span>
            <button type="button" data-action="delete-diet" data-did="${item.id}" aria-label="식단 삭제"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      `).join('');

      return `
        <article class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(meal)}</h3>
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 tabular-nums">
              ${Math.round(mealCal).toLocaleString()} kcal
            </span>
          </div>
          <div>${itemsHtml}</div>
        </article>
      `;
    }).join('');
  }

  function renderAll() {
    renderCategoryPills();
    renderMealPills();
    renderWorkouts();
    renderDiets();
    updateSuggestions();
  }

  // ==================== Export / Import / CSV ====================
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const filename = `fitlog-backup-${getTodayStr()}.json`;
    downloadFile(JSON.stringify(state, null, 2), filename, 'application/json');
    showToast('JSON 백업 파일이 다운로드되었습니다.');
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed.days !== 'object') {
          showToast('올바른 FitLog 백업 파일이 아닙니다.');
          return;
        }
        if (!confirm('불러온 데이터로 현재 기록을 덮어쓰시겠습니까?')) return;
        state = {
          days: parsed.days,
          goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
          theme: parsed.theme || state.theme
        };
        saveState();
        applyTheme();
        renderAll();
        closeSettings();
        showToast('데이터를 성공적으로 복원했습니다.');
      } catch (err) {
        showToast('JSON 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  }

  function csvCell(val) {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportCsv() {
    const rows = [
      ['날짜', '구분', '부위/끼니', '종목/음식명', '세트/칼로리(kcal)', '무게(kg)/탄수화물(g)', '횟수/단백질(g)', '완료여부/지방(g)']
    ];

    const sortedDates = Object.keys(state.days).sort();
    sortedDates.forEach((dateStr) => {
      const day = state.days[dateStr];
      (day.workouts || []).forEach((w) => {
        (w.sets || []).forEach((s, idx) => {
          rows.push([
            dateStr,
            '운동',
            w.category,
            w.name,
            `${idx + 1}세트`,
            s.weight,
            s.reps,
            s.completed ? '완료' : '미완료'
          ]);
        });
      });

      (day.diets || []).forEach((d) => {
        rows.push([
          dateStr,
          '식단',
          d.meal,
          d.name,
          d.calories,
          d.carbs,
          d.protein,
          d.fat
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
    downloadFile(csvContent, `fitlog-records-${getTodayStr()}.csv`, 'text/csv;charset=utf-8;');
    showToast('CSV 파일이 다운로드되었습니다.');
  }

  // ==================== Settings Modal ====================
  function openSettings() {
    el.goalCalories.value = state.goals.calories;
    el.goalCarbs.value = state.goals.carbs;
    el.goalProtein.value = state.goals.protein;
    el.goalFat.value = state.goals.fat;
    el.settingsModal.classList.remove('hidden');
    el.settingsModal.classList.add('flex');
  }

  function closeSettings() {
    el.settingsModal.classList.add('hidden');
    el.settingsModal.classList.remove('flex');
  }

  // ==================== Event Listeners ====================
  function initEvents() {
    el.btnTheme.addEventListener('click', toggleTheme);
    el.btnToday.addEventListener('click', () => setDate(getTodayStr()));
    el.btnPrevDay.addEventListener('click', () => setDate(shiftDate(currentDate, -1)));
    el.btnNextDay.addEventListener('click', () => setDate(shiftDate(currentDate, 1)));
    el.datePicker.addEventListener('change', (e) => {
      if (e.target.value) setDate(e.target.value);
    });

    el.navWorkout.addEventListener('click', () => setTab('workout'));
    el.navDiet.addEventListener('click', () => setTab('diet'));

    // Category selection
    el.workoutCategories.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      selectedCategory = btn.dataset.cat;
      renderCategoryPills();
    });

    // Previous workout lookup on input
    el.workoutName.addEventListener('input', updatePrevWorkoutLookup);
    el.btnApplyPrev.addEventListener('click', applyPreviousWorkout);
    el.btnWorkoutPrevLookup.addEventListener('click', applyPreviousWorkout);

    // Add workout
    el.workoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = el.workoutName.value.trim();
      if (!name) return;

      const weight = parseFloat(el.workoutWeight.value) || 0;
      const reps = Math.max(1, parseInt(el.workoutReps.value, 10) || 1);
      const setCount = Math.min(20, Math.max(1, parseInt(el.workoutSets.value, 10) || 1));

      const sets = Array.from({ length: setCount }, () => ({
        weight,
        reps,
        completed: false
      }));

      const day = getDayData(currentDate);
      day.workouts.push({
        id: generateId('w'),
        category: selectedCategory,
        name,
        sets,
        createdAt: Date.now()
      });

      saveState();
      el.workoutName.value = '';
      el.prevRecordBanner.classList.add('hidden');
      el.btnWorkoutPrevLookup.classList.add('hidden');
      renderWorkouts();
      updateSuggestions();
      showToast('운동이 추가되었습니다.');
    });

    // Workout list interactions (delegated)
    el.workoutList.addEventListener('change', (e) => {
      const target = e.target;
      const action = target.dataset.action;
      if (!action) return;

      const day = getDayData(currentDate);
      const workout = day.workouts.find((w) => w.id === target.dataset.wid);
      if (!workout) return;
      const sIdx = parseInt(target.dataset.sidx, 10);

      if (action === 'toggle-set' && workout.sets[sIdx]) {
        workout.sets[sIdx].completed = target.checked;
        saveState();
        renderWorkouts();
      } else if (action === 'edit-set' && workout.sets[sIdx]) {
        const field = target.dataset.field;
        const val = parseFloat(target.value);
        if (field === 'weight') {
          workout.sets[sIdx].weight = isNaN(val) || val < 0 ? 0 : val;
        } else if (field === 'reps') {
          workout.sets[sIdx].reps = isNaN(val) || val < 1 ? 1 : Math.round(val);
        }
        saveState();
        // Update summary volume without full re-render to keep focus smooth
        renderWorkouts();
      }
    });

    el.workoutList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const wid = btn.dataset.wid;
      const day = getDayData(currentDate);
      const wIdx = day.workouts.findIndex((w) => w.id === wid);
      if (wIdx === -1) return;

      if (action === 'delete-workout') {
        day.workouts.splice(wIdx, 1);
        saveState();
        renderWorkouts();
        showToast('운동이 삭제되었습니다.');
      } else if (action === 'add-set') {
        const sets = day.workouts[wIdx].sets;
        const last = sets[sets.length - 1] || { weight: 0, reps: 10 };
        sets.push({ weight: last.weight, reps: last.reps, completed: false });
        saveState();
        renderWorkouts();
      } else if (action === 'remove-set') {
        const sIdx = parseInt(btn.dataset.sidx, 10);
        if (day.workouts[wIdx].sets.length > 1) {
          day.workouts[wIdx].sets.splice(sIdx, 1);
          saveState();
          renderWorkouts();
        }
      }
    });

    // Meal selection
    el.dietMeals.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-meal]');
      if (!btn) return;
      selectedMeal = btn.dataset.meal;
      renderMealPills();
    });

    el.dietName.addEventListener('input', updatePrevFoodLookup);
    el.btnApplyPrevFood.addEventListener('click', applyPreviousFood);

    // Add diet
    el.dietForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = el.dietName.value.trim();
      if (!name) return;

      const calories = Math.max(0, parseFloat(el.dietCalories.value) || 0);
      const carbs = Math.max(0, parseFloat(el.dietCarbs.value) || 0);
      const protein = Math.max(0, parseFloat(el.dietProtein.value) || 0);
      const fat = Math.max(0, parseFloat(el.dietFat.value) || 0);

      const day = getDayData(currentDate);
      day.diets.push({
        id: generateId('d'),
        meal: selectedMeal,
        name,
        calories,
        carbs,
        protein,
        fat,
        createdAt: Date.now()
      });

      saveState();
      el.dietName.value = '';
      el.dietCalories.value = '';
      el.dietCarbs.value = '0';
      el.dietProtein.value = '0';
      el.dietFat.value = '0';
      el.prevFoodBanner.classList.add('hidden');
      renderDiets();
      updateSuggestions();
      showToast('식단이 추가되었습니다.');
    });

    // Delete diet
    el.dietList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="delete-diet"]');
      if (!btn) return;
      const did = btn.dataset.did;
      const day = getDayData(currentDate);
      day.diets = day.diets.filter((d) => d.id !== did);
      saveState();
      renderDiets();
      showToast('식단이 삭제되었습니다.');
    });

    // Settings Modal
    el.btnSettings.addEventListener('click', openSettings);
    el.btnEditGoals.addEventListener('click', openSettings);
    el.btnCloseSettings.addEventListener('click', closeSettings);
    el.settingsModal.addEventListener('click', (e) => {
      if (e.target === el.settingsModal) closeSettings();
    });

    el.goalsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.goals = {
        calories: Math.max(100, parseInt(el.goalCalories.value, 10) || DEFAULT_GOALS.calories),
        carbs: Math.max(1, parseInt(el.goalCarbs.value, 10) || DEFAULT_GOALS.carbs),
        protein: Math.max(1, parseInt(el.goalProtein.value, 10) || DEFAULT_GOALS.protein),
        fat: Math.max(1, parseInt(el.goalFat.value, 10) || DEFAULT_GOALS.fat)
      };
      saveState();
      renderDiets();
      closeSettings();
      showToast('일일 식단 목표가 저장되었습니다.');
    });

    el.btnExportJson.addEventListener('click', exportJson);
    el.inputImportJson.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importJson(file);
      e.target.value = '';
    });
    el.btnExportCsv.addEventListener('click', exportCsv);

    el.btnClearAll.addEventListener('click', () => {
      if (!confirm('정말 모든 운동 및 식단 기록을 삭제하시겠습니까?')) return;
      if (!confirm('삭제된 데이터는 복구할 수 없습니다. 계속하시겠습니까?')) return;
      state.days = {};
      state.goals = { ...DEFAULT_GOALS };
      saveState();
      renderAll();
      closeSettings();
      showToast('모든 데이터가 초기화되었습니다.');
    });
  }

  // ==================== PWA Service Worker ====================
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  // ==================== Init ====================
  applyTheme();
  initEvents();
  setDate(currentDate);
  setTab('workout');
  registerSW();
})();
