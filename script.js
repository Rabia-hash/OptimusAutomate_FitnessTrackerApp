// =============================================
// ===== MAIN APPLICATION LOGIC =====
// =============================================

const STORAGE_KEY = 'fitness_tracker_internship_data';
let fitnessData = [];
let chartInstance = null;
let storageAvailable = false;

// =============================================
// ===== STORAGE MANAGEMENT =====
// =============================================

function checkStorage() {
    try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        storageAvailable = true;
        return true;
    } catch (e) {
        storageAvailable = false;
        console.warn('⚠️ localStorage is not available. Data will not persist between sessions.');
        return false;
    }
}

function saveData() {
    if (!storageAvailable) {
        console.warn('Storage not available - data saved to memory only');
        return false;
    }
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fitnessData));
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        return false;
    }
}

function loadData() {
    if (!checkStorage()) {
        fitnessData = [];
        return;
    }
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                fitnessData = parsed.filter(d => d != null).map(d => {
                    if (!d.id) d.id = Date.now() + Math.random();
                    if (!d.date) d.date = new Date(d.timestamp || d.id).toISOString().split('T')[0];
                    return d;
                });
                console.log(`✅ Loaded ${fitnessData.length} entries from storage`);
                return;
            }
        }
    } catch (e) {
        console.warn('Could not load data, starting fresh:', e);
    }
    
    fitnessData = [];
    saveData();
}

// =============================================
// ===== INITIALIZATION =====
// =============================================

function init() {
    checkStorage();
    loadData();
    render();
    setupChart();
    setupAutoSave();
    
    if (!storageAvailable) {
        showToast('⚠️ Data will not be saved - localStorage unavailable', 'error');
    } else {
        console.log('✅ localStorage available');
    }
}

// =============================================
// ===== DATA MANAGEMENT =====
// =============================================

function addEntry(type, minutes, steps, calories) {
    // Get values from form if not passed directly
    if (typeof type === 'undefined') {
        type = document.getElementById('exerciseType').value;
        minutes = parseInt(document.getElementById('minutesInput').value) || 0;
        steps = parseInt(document.getElementById('stepsInput').value) || 0;
        calories = parseInt(document.getElementById('caloriesInput').value) || 0;
    }
    
    const entry = {
        id: Date.now(),
        type: type || 'Other',
        minutes: parseInt(minutes) || 0,
        steps: parseInt(steps) || 0,
        calories: parseInt(calories) || 0,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
    };
    
    if (entry.minutes <= 0 && entry.steps <= 0 && entry.calories <= 0) {
        showToast('Please enter at least one value', 'error');
        return false;
    }
    
    fitnessData.unshift(entry);
    saveData();
    render();
    showToast(`${entry.type} logged successfully! 🎉`, 'success');
    return true;
}

function deleteEntry(id) {
    fitnessData = fitnessData.filter(entry => entry.id !== id);
    saveData();
    render();
    showToast('Entry deleted', 'info');
}

function clearAllData() {
    if (confirm('Delete all fitness data? This cannot be undone.')) {
        fitnessData = [];
        saveData();
        render();
        showToast('All data cleared', 'info');
    }
}

function getTodayData() {
    const today = new Date().toISOString().split('T')[0];
    return fitnessData.filter(entry => entry.date === today);
}

function getWeekData() {
    const weekDays = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayEntries = fitnessData.filter(entry => entry.date === dateStr);
        const steps = dayEntries.reduce((sum, e) => sum + e.steps, 0);
        const calories = dayEntries.reduce((sum, e) => sum + e.calories, 0);
        
        weekDays.push({
            date: dateStr,
            day: dayName,
            steps: steps,
            calories: calories,
            workouts: dayEntries.length
        });
    }
    return weekDays;
}

// =============================================
// ===== RENDER FUNCTIONS =====
// =============================================

function render() {
    const todayData = getTodayData();
    
    let totalSteps = 0, totalCalories = 0, totalWorkouts = 0, totalMinutes = 0;
    todayData.forEach(entry => {
        totalSteps += entry.steps || 0;
        totalCalories += entry.calories || 0;
        totalWorkouts += 1;
        totalMinutes += entry.minutes || 0;
    });
    
    // Update stats
    document.getElementById('totalSteps').textContent = totalSteps.toLocaleString();
    document.getElementById('totalCalories').textContent = totalCalories.toLocaleString();
    document.getElementById('totalWorkouts').textContent = totalWorkouts;
    document.getElementById('totalMinutes').textContent = totalMinutes;
    
    // Update progress bars
    const stepTarget = 10000, calTarget = 2000, workoutTarget = 3, minuteTarget = 60;
    const stepPct = Math.min(100, (totalSteps / stepTarget) * 100);
    const calPct = Math.min(100, (totalCalories / calTarget) * 100);
    const workoutPct = Math.min(100, (totalWorkouts / workoutTarget) * 100);
    const minutePct = Math.min(100, (totalMinutes / minuteTarget) * 100);
    
    document.getElementById('stepsFill').style.width = stepPct + '%';
    document.getElementById('caloriesFill').style.width = calPct + '%';
    document.getElementById('workoutsFill').style.width = workoutPct + '%';
    document.getElementById('minutesFill').style.width = minutePct + '%';
    
    document.getElementById('stepsText').textContent = `${totalSteps.toLocaleString()} / ${stepTarget.toLocaleString()}`;
    document.getElementById('caloriesText').textContent = `${totalCalories.toLocaleString()} / ${calTarget.toLocaleString()}`;
    document.getElementById('workoutsText').textContent = `${totalWorkouts} / ${workoutTarget}`;
    document.getElementById('minutesText').textContent = `${totalMinutes} / ${minuteTarget}`;
    
    renderLogList();
    updateChart();
    document.getElementById('entryCount').textContent = `(${fitnessData.length})`;
}

function renderLogList() {
    const container = document.getElementById('logList');
    
    if (fitnessData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-dumbbell"></i>
                <p>No entries yet. Start tracking your fitness!</p>
                <small style="color:#cbd5e1;">Add your first workout above ☝️</small>
            </div>
        `;
        return;
    }
    
    const displayData = fitnessData.slice(0, 20);
    const emojiMap = {
        'Walking': '🚶',
        'Running': '🏃',
        'Cycling': '🚴',
        'Swimming': '🏊',
        'Yoga': '🧘',
        'Strength': '🏋️',
        'Other': '📌'
    };
    
    let html = '';
    displayData.forEach(entry => {
        const time = new Date(entry.timestamp || entry.id);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const emoji = emojiMap[entry.type] || '📌';
        
        html += `
            <div class="log-entry">
                <div class="log-entry-left">
                    <span style="font-size:20px;">${emoji}</span>
                    <div>
                        <div class="log-entry-type">${entry.type}</div>
                        <div class="log-entry-details">
                            ${entry.minutes > 0 ? `<span>⏱️ ${entry.minutes}m</span>` : ''}
                            ${entry.steps > 0 ? `<span>👟 ${entry.steps.toLocaleString()}</span>` : ''}
                            <span>🔥 ${entry.calories} cal</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="log-entry-time">${dateStr} ${timeStr}</span>
                    <button class="log-entry-delete" onclick="deleteEntry(${entry.id})">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// =============================================
// ===== CHART =====
// =============================================

function setupChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) {
        console.error('Chart canvas not found!');
        return;
    }
    
    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Steps',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 6,
                    order: 1
                },
                {
                    label: 'Calories',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: '#22c55e',
                    borderWidth: 2,
                    borderRadius: 6,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 16
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (!chartInstance) return;
    
    const weekData = getWeekData();
    const days = weekData.map(d => d.day);
    const steps = weekData.map(d => d.steps);
    const calories = weekData.map(d => d.calories);
    
    chartInstance.data.labels = days;
    chartInstance.data.datasets[0].data = steps;
    chartInstance.data.datasets[1].data = calories;
    chartInstance.update();
}

// =============================================
// ===== AUTO-SAVE =====
// =============================================

function setupAutoSave() {
    window.addEventListener('beforeunload', saveData);
}

// =============================================
// ===== TOAST NOTIFICATIONS =====
// =============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    const colors = {
        success: '#0f172a',
        error: '#dc2626',
        info: '#3b82f6'
    };
    toast.style.background = colors[type] || '#0f172a';
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// =============================================
// ===== EXPORT / IMPORT =====
// =============================================

function exportData() {
    const dataStr = JSON.stringify(fitnessData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully! 📤', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data) && data.length > 0) {
                    fitnessData = data;
                    saveData();
                    render();
                    showToast(`Imported ${data.length} entries! 📥`, 'success');
                } else {
                    showToast('Invalid data format', 'error');
                }
            } catch (err) {
                showToast('Error reading file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// =============================================
// ===== SAMPLE DATA =====
// =============================================

function addSampleData() {
    const samples = [
        { type: 'Walking', minutes: 30, steps: 3000, calories: 120 },
        { type: 'Running', minutes: 20, steps: 4000, calories: 200 },
        { type: 'Cycling', minutes: 40, steps: 0, calories: 250 },
        { type: 'Yoga', minutes: 25, steps: 0, calories: 80 },
        { type: 'Strength', minutes: 35, steps: 0, calories: 180 },
    ];
    
    samples.forEach((sample, index) => {
        const entry = {
            id: Date.now() + index,
            type: sample.type,
            minutes: sample.minutes,
            steps: sample.steps,
            calories: sample.calories,
            timestamp: Date.now() - (index * 86400000),
            date: new Date(Date.now() - (index * 86400000)).toISOString().split('T')[0]
        };
        fitnessData.push(entry);
    });
    
    saveData();
    render();
    showToast('Sample data added! 🎉', 'success');
}

// =============================================
// ===== MAKE FUNCTIONS GLOBAL =====
// =============================================

window.addEntry = addEntry;
window.deleteEntry = deleteEntry;
window.clearAll = clearAllData;
window.exportData = exportData;
window.importData = importData;
window.addSampleData = addSampleData;

// =============================================
// ===== START APPLICATION =====
// =============================================

document.addEventListener('DOMContentLoaded', init);