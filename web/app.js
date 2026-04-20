class HabitTracker {

    static BADGE_DEFINITIONS = [
        { id: '1hour', name: '1 Hour', milliseconds: 3600000 },
        { id: '3hour', name: '3 Hours', milliseconds: 10800000 },
        { id: '6hour', name: '6 Hours', milliseconds: 21600000 },
        { id: '12hour', name: '12 Hours', milliseconds: 43200000 },
        { id: '1day', name: '1 Day', milliseconds: 86400000 },
        { id: '2day', name: '2 Days', milliseconds: 172800000 },
        { id: '3day', name: '3 Days', milliseconds: 259200000 },
        { id: '4day', name: '4 Days', milliseconds: 345600000 },
        { id: '5day', name: '5 Days', milliseconds: 432000000 },
        { id: '6day', name: '6 Days', milliseconds: 518400000 },
        { id: '1week', name: '1 Week', milliseconds: 604800000 },
        { id: '10day', name: '10 Days', milliseconds: 864000000 },
        { id: '12day', name: '12 Days', milliseconds: 1036800000 },
        { id: '2week', name: '2 Weeks', milliseconds: 1209600000 },
        { id: '16day', name: '16 Days', milliseconds: 1382400000 },
        { id: '3week', name: '3 Weeks', milliseconds: 1814400000 },
        { id: '1month', name: '1 Month', milliseconds: 2592000000 },
        { id: '50day', name: '50 Days', milliseconds: 4320000000 },
        { id: '6week', name: '6 Weeks', milliseconds: 3628800000 },
        { id: '2month', name: '2 Months', milliseconds: 5184000000 },
        { id: '75day', name: '75 Days', milliseconds: 6480000000 },
        { id: '3month', name: '3 Months', milliseconds: 7776000000 },
        { id: '100day', name: '100 Days', milliseconds: 8640000000 },
        { id: '4month', name: '4 Months', milliseconds: 10368000000 },
        { id: '5month', name: '5 Months', milliseconds: 12960000000 },
        { id: '6month', name: '6 Months', milliseconds: 15552000000 },
        { id: '1year', name: '1 Year', milliseconds: 31536000000 },
        { id: '2year', name: '2 Years', milliseconds: 63072000000 }
    ].sort((a, b) => a.milliseconds - b.milliseconds);

    static CATEGORY_ICONS = {
        health: '💪',
        productivity: '⚡',
        mindfulness: '🧘',
        finance: '💰',
        other: '📌'
    };

    constructor() {
        this.habits = [];
        this.currentEditId = null;
        this.currentDeleteId = null;
        this.activeFilter = 'all';
        this.motivationalMessages = [
            "You're stronger than you think! 💪",
            "Every moment is a victory! 🏆",
            "Keep going, you've got this! 🔥",
            "Progress, not perfection! 📈",
            "You're doing amazing! ⭐",
            "One day at a time! 🌅",
            "Proud of your journey! 🚀",
            "Stay strong, stay focused! 🎯",
            "You're worth it! 💎",
            "Believe in yourself! ✨",
            "Consistency is key! 🔑",
            "Small steps, big results! 🏔️"
        ];

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.migrateDataIfNeeded();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.startStreakUpdater();
    }

    bindEvents() {
        const eventMap = {
            'addHabitBtn': ['click', () => this.openHabitModal()],
            'closeModalBtn': ['click', () => this.closeHabitModal()],
            'cancelBtn': ['click', () => this.closeHabitModal()],
            'habitForm': ['submit', (e) => this.handleHabitSubmit(e)],
            'closeOccurrenceBtn': ['click', () => this.closeOccurrenceModal()],
            'cancelOccurrenceBtn': ['click', () => this.closeOccurrenceModal()],
            'occurrenceForm': ['submit', (e) => this.handleOccurrenceSubmit(e)],
            'confirmDeleteBtn': ['click', () => this.confirmDelete()],
            'cancelDeleteBtn': ['click', () => this.closeDeleteModal()],
            'confirmDeleteOccurrenceBtn': ['click', () => this.confirmDeleteOccurrence()],
            'cancelDeleteOccurrenceBtn': ['click', () => this.closeDeleteOccurrenceModal()],
            'exportBtn': ['click', () => this.exportData()],
            'importBtn': ['click', () => this.triggerImport()],
            'importFile': ['change', (e) => this.handleImport(e)],
            'closeBadgesBtn': ['click', () => this.closeBadgesModal()]
        };

        Object.entries(eventMap).forEach(([id, [event, handler]]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        });

        // Category filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeFilter = btn.dataset.category;
                this.render();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
    }

    // Storage
    loadFromStorage() {
        const stored = localStorage.getItem('habitTrackerHabits');
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            this.habits = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error('habitTrackerHabits bozuk, yedekleniyor:', err);
            localStorage.setItem('habitTrackerHabits_corrupted_' + Date.now(), stored);
            this.habits = [];
        }
    }

    saveToStorage() {
        localStorage.setItem('habitTrackerHabits', JSON.stringify(this.habits));
    }

    migrateDataIfNeeded() {
        let updated = false;
        this.habits.forEach(habit => {
            if (!habit.currentStreakStart) {
                if (habit.occurrences.length > 0) {
                    habit.occurrences.sort((a, b) => new Date(b.date) - new Date(a.date));
                    habit.currentStreakStart = habit.occurrences[0].date;
                } else {
                    habit.currentStreakStart = habit.startDate;
                }
                updated = true;
            }
            if (!habit.earnedBadges) {
                habit.earnedBadges = [];
                updated = true;
            }
            if (!habit.category) {
                habit.category = 'other';
                updated = true;
            }
        });

        if (updated) {
            this.habits.forEach(habit => this.updateStreakAndBadges(habit));
            this.saveToStorage();
        }
    }

    // CRUD
    addHabit(name, startDate, category) {
        const habit = {
            id: Date.now().toString(),
            name: name,
            startDate: new Date(startDate).toISOString(),
            category: category || 'other',
            occurrences: [],
            currentStreakStart: new Date(startDate).toISOString(),
            earnedBadges: [],
            createdAt: new Date().toISOString()
        };
        this.habits.push(habit);
        this.updateStreakAndBadges(habit);
        this.saveToStorage();
        this.render();
        this.updateStats();
        this.showMotivationalMessage();
    }

    updateHabit(id, name, startDate, category) {
        const habit = this.habits.find(h => h.id === id);
        if (habit) {
            habit.name = name;
            habit.category = category || habit.category;
            const oldStartDate = habit.startDate;
            habit.startDate = new Date(startDate).toISOString();
            habit.occurrences = habit.occurrences.filter(o =>
                new Date(o.date) >= new Date(habit.startDate)
            );
            if (oldStartDate !== habit.startDate || habit.occurrences.length === 0) {
                this.updateStreakAndBadges(habit);
            }
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    deleteHabit(id) {
        this.habits = this.habits.filter(h => h.id !== id);
        this.saveToStorage();
        this.render();
        this.updateStats();
    }

    addOccurrence(habitId, date, notes) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            const occurrence = {
                id: Date.now().toString(),
                date: new Date(date).toISOString(),
                notes: notes || ''
            };
            habit.occurrences.push(occurrence);
            habit.occurrences.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.updateStreakAndBadges(habit);
            this.saveToStorage();
            this.render();
            this.updateStats();
        }
    }

    deleteOccurrence(habitId, occurrenceId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            habit.occurrences = habit.occurrences.filter(o => o.id !== occurrenceId);
            this.updateStreakAndBadges(habit);
            this.saveToStorage();
            this.render();
            this.updateStats();
            this.updateOccurrencesList(habitId);
        }
    }

    // Badge and Streak
    updateStreakAndBadges(habit) {
        const previousStreakStart = habit.currentStreakStart;
        if (habit.occurrences.length === 0) {
            habit.currentStreakStart = habit.startDate;
        } else {
            const sortedOccurrences = [...habit.occurrences].sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );
            habit.currentStreakStart = sortedOccurrences[0].date;
        }
        if (previousStreakStart && new Date(habit.currentStreakStart) > new Date(previousStreakStart)) {
            habit.earnedBadges = [];
        }
        habit.earnedBadges = this.calculateEarnedBadges(habit);
    }

    calculateEarnedBadges(habit) {
        const now = new Date();
        const currentStreakStart = habit.occurrences.length === 0
            ? new Date(habit.startDate)
            : new Date(habit.occurrences[0].date);
        const currentStreakDuration = now - currentStreakStart;
        const earnedBadges = [];

        for (const badge of HabitTracker.BADGE_DEFINITIONS) {
            if (currentStreakDuration >= badge.milliseconds) {
                earnedBadges.push({
                    id: badge.id,
                    name: badge.name,
                    earnedAt: new Date(currentStreakStart.getTime() + badge.milliseconds).toISOString()
                });
            }
        }
        earnedBadges.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
        return earnedBadges;
    }

    getNextBadge(habit) {
        const now = new Date();
        const streakStart = new Date(habit.currentStreakStart);
        const currentStreakDuration = now - streakStart;

        for (const badge of HabitTracker.BADGE_DEFINITIONS) {
            if (currentStreakDuration < badge.milliseconds) {
                const timeRemaining = badge.milliseconds - currentStreakDuration;
                return {
                    name: badge.name,
                    timeRemaining: timeRemaining,
                    progress: (currentStreakDuration / badge.milliseconds) * 100,
                    formattedTimeRemaining: this.formatDuration(timeRemaining)
                };
            }
        }
        return null;
    }

    getLatestBadges(habit, count = 3) {
        return habit.earnedBadges.slice(0, count);
    }

    formatBadgeDisplay(badge, size = 24) {
        return `<img src="images/badge_${badge.id}_image.png" width="${size}" height="${size}" alt="${badge.id}" class="badge-icon" onerror="this.outerHTML='🔥'"> ${badge.name}`;
    }

    calculateCurrentStreak(habit) {
        const now = new Date();
        const start = habit.occurrences.length === 0
            ? new Date(habit.startDate)
            : new Date(habit.occurrences[0].date);
        return now - start;
    }

    calculateCurrentStreakFormatted(habit) {
        return this.formatDuration(this.calculateCurrentStreak(habit));
    }

    calculateLongestStreak(habit) {
        if (habit.occurrences.length === 0) {
            return this.calculateCurrentStreak(habit);
        }
        const now = new Date();
        const startDate = new Date(habit.startDate);
        const sortedOccurrences = [...habit.occurrences].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );
        let longestStreak = 0;
        let previousDate = startDate;
        for (const occurrence of sortedOccurrences) {
            const occurrenceDate = new Date(occurrence.date);
            const streakLength = occurrenceDate - previousDate;
            if (streakLength > longestStreak) longestStreak = streakLength;
            previousDate = occurrenceDate;
        }
        const currentStreakLength = now - previousDate;
        if (currentStreakLength > longestStreak) longestStreak = currentStreakLength;
        return longestStreak;
    }

    getDayCount(habit) {
        const now = new Date();
        const start = new Date(habit.startDate);
        return Math.floor((now - start) / 86400000);
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const displayHours = hours % 24;
        const displayMinutes = minutes % 60;

        if (days > 0) {
            return `${days}d ${displayHours}h ${displayMinutes}m`;
        } else if (hours > 0) {
            return `${displayHours}h ${displayMinutes}m`;
        } else {
            return `${displayMinutes}m`;
        }
    }

    formatDurationShort(milliseconds) {
        const days = Math.floor(milliseconds / 86400000);
        if (days > 0) return `${days}d`;
        const hours = Math.floor(milliseconds / 3600000);
        if (hours > 0) return `${hours}h`;
        return `${Math.floor(milliseconds / 60000)}m`;
    }

    // Stats Dashboard
    updateStats() {
        document.getElementById('totalHabits').textContent = this.habits.length;

        let bestStreak = 0;
        let totalBadges = 0;
        let totalOccurrences = 0;
        let thisWeekCount = 0;

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        this.habits.forEach(habit => {
            const longest = this.calculateLongestStreak(habit);
            if (longest > bestStreak) bestStreak = longest;
            totalBadges += habit.earnedBadges.length;
            totalOccurrences += habit.occurrences.length;

            const recentOccurrences = habit.occurrences.filter(
                occ => new Date(occ.date).getTime() >= sevenDaysAgo
            );
            thisWeekCount += recentOccurrences.length;
        });

        document.getElementById('totalStreak').textContent = bestStreak > 0
            ? this.formatDurationShort(bestStreak) : '0d';
        document.getElementById('totalBadges').textContent = totalBadges;
        document.getElementById('totalOccurrences').textContent = totalOccurrences;
        document.getElementById('thisWeekCount').textContent = thisWeekCount;
    }

    // Rendering
    render() {
        const habitsList = document.getElementById('habitsList');
        const filteredHabits = this.activeFilter === 'all'
            ? this.habits
            : this.habits.filter(h => h.category === this.activeFilter);

        if (filteredHabits.length === 0) {
            const message = this.habits.length === 0
                ? 'No habits tracked yet'
                : 'No habits in this category';
            const sub = this.habits.length === 0
                ? 'Click the button above to start tracking your first habit!'
                : 'Try a different filter or add a new habit.';
            habitsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <h3>${message}</h3>
                    <p>${sub}</p>
                </div>
            `;
            return;
        }

        habitsList.innerHTML = filteredHabits.map(habit => this.renderHabitCard(habit)).join('');
    }

    renderHabitCard(habit) {
        const latestBadges = this.getLatestBadges(habit, 3);
        const nextBadge = this.getNextBadge(habit);
        const categoryIcon = HabitTracker.CATEGORY_ICONS[habit.category] || '📌';
        const dayCount = this.getDayCount(habit);

        const progressPercent = nextBadge ? Math.min(nextBadge.progress, 100) : 100;
        const progressLabel = nextBadge
            ? `${Math.round(progressPercent)}% to ${nextBadge.name}`
            : 'All badges earned!';

        const badgesHtml = latestBadges.length > 0 ? `
            <div class="badge-display">
                <div class="badge-items">
                    ${latestBadges.map(badge =>
                        `<span class="badge-item">${this.formatBadgeDisplay(badge)}</span>`
                    ).join('')}
                </div>
                ${habit.earnedBadges.length > 3 ?
                    `<button class="view-all-badges" onclick="tracker.openBadgesModal('${habit.id}')">View all ${habit.earnedBadges.length} badges</button>`
                    : ''
                }
            </div>
        ` : '';

        const nextBadgeHtml = nextBadge ? `
            <div class="next-badge">
                <span class="next-badge-label">Next:</span>
                <span class="next-badge-name">⭐ ${nextBadge.name}</span>
                <span class="next-badge-time">in ${nextBadge.formattedTimeRemaining}</span>
            </div>
        ` : `
            <div class="next-badge all-earned">
                <span class="next-badge-label">🏆 All badges earned!</span>
            </div>
        `;

        return `
            <div class="habit-card" data-id="${habit.id}" data-category="${habit.category}">
                <div class="habit-header">
                    <div class="habit-name-section">
                        <span class="habit-category-icon">${categoryIcon}</span>
                        <div>
                            <h3 class="habit-name">${this.escapeHtml(habit.name)}</h3>
                            <div class="habit-days-count">Day ${dayCount}</div>
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="icon-btn add-occurrence" title="Log Occurrence" onclick="tracker.openOccurrenceModal('${habit.id}')">+</button>
                        <button class="icon-btn edit" title="Edit" onclick="tracker.openHabitModal('${habit.id}')">✏️</button>
                        <button class="icon-btn delete" title="Delete" onclick="tracker.openDeleteModal('${habit.id}')">🗑️</button>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="progress-label">
                        <span>${progressLabel}</span>
                        <span>${habit.earnedBadges.length} badges</span>
                    </div>
                </div>
                <div class="streak-info">
                    <div class="streak-item">
                        <div class="streak-label">Current</div>
                        <div class="streak-value">${this.calculateCurrentStreakFormatted(habit)}</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-label">Longest</div>
                        <div class="streak-value">${this.formatDuration(this.calculateLongestStreak(habit))}</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-label">Logs</div>
                        <div class="streak-value occurrences">${habit.occurrences.length}</div>
                    </div>
                </div>
                ${badgesHtml}
                ${nextBadgeHtml}
            </div>
        `;
    }

    // Modals
    openHabitModal(habitId = null) {
        const modal = document.getElementById('habitModal');
        const form = document.getElementById('habitForm');
        const title = document.getElementById('modalTitle');

        if (habitId) {
            const habit = this.habits.find(h => h.id === habitId);
            if (habit) {
                this.currentEditId = habitId;
                title.textContent = 'Edit Habit';
                document.getElementById('habitName').value = habit.name;
                document.getElementById('habitCategory').value = habit.category || 'other';
                document.getElementById('startDate').value = this.formatDateTimeLocal(new Date(habit.startDate));
            }
        } else {
            this.currentEditId = null;
            title.textContent = 'Add New Habit';
            form.reset();
            document.getElementById('startDate').value = this.formatDateTimeLocal(new Date());
        }

        modal.classList.add('active');
    }

    closeHabitModal() {
        document.getElementById('habitModal').classList.remove('active');
        document.getElementById('habitForm').reset();
        this.currentEditId = null;
    }

    openOccurrenceModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        document.getElementById('occurrenceHabitId').value = habitId;
        document.getElementById('occurrenceDate').value = this.formatDateTimeLocal(new Date());
        const dateInput = document.getElementById('occurrenceDate');
        dateInput.min = this.formatDateTimeLocal(new Date(habit.startDate));
        dateInput.max = this.formatDateTimeLocal(new Date());
        document.getElementById('occurrenceModal').classList.add('active');
        this.updateOccurrencesList(habitId);
    }

    closeOccurrenceModal() {
        document.getElementById('occurrenceModal').classList.remove('active');
        document.getElementById('occurrenceForm').reset();
    }

    openDeleteOccurrenceModal(habitId, occurrenceId) {
        const confirmBtn = document.getElementById('confirmDeleteOccurrenceBtn');
        if (confirmBtn) {
            confirmBtn.dataset.habitId = habitId;
            confirmBtn.dataset.occurrenceId = occurrenceId;
        }
        document.getElementById('deleteOccurrenceModal').classList.add('active');
    }

    closeDeleteOccurrenceModal() {
        document.getElementById('deleteOccurrenceModal').classList.remove('active');
        const confirmBtn = document.getElementById('confirmDeleteOccurrenceBtn');
        if (confirmBtn) {
            delete confirmBtn.dataset.habitId;
            delete confirmBtn.dataset.occurrenceId;
        }
    }

    updateOccurrencesList(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        const container = document.getElementById('existingOccurrences');
        if (!habit || !container) return;

        if (habit.occurrences.length === 0) {
            container.innerHTML = '<p class="no-occurrences">No occurrences recorded yet.</p>';
            return;
        }

        container.innerHTML = habit.occurrences.map(occurrence => {
            const date = new Date(occurrence.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const noteDisplay = occurrence.notes
                ? (occurrence.notes.length > 30 ? occurrence.notes.substring(0, 30) + '...' : occurrence.notes)
                : '';

            return `
                <div class="occurrence-item">
                    <div class="occurrence-info">
                        <div class="occurrence-date">${formattedDate}</div>
                        ${noteDisplay ? `<div class="occurrence-note">${this.escapeHtml(noteDisplay)}</div>` : ''}
                    </div>
                    <div class="occurrence-actions">
                        <button class="icon-btn delete" title="Delete" onclick="tracker.openDeleteOccurrenceModal('${habitId}', '${occurrence.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    openDeleteModal(habitId) {
        this.currentDeleteId = habitId;
        document.getElementById('deleteModal').classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        this.currentDeleteId = null;
    }

    openBadgesModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        const modal = document.getElementById('badgesModal');
        if (!modal) return;

        const habitNameEl = document.getElementById('badgeHabitName');
        const badgesListEl = document.getElementById('badgesList');
        if (habitNameEl) habitNameEl.textContent = habit.name;

        if (badgesListEl) {
            if (habit.earnedBadges.length === 0) {
                badgesListEl.innerHTML = '<p class="no-badges">No badges earned yet. Keep going!</p>';
            } else {
                badgesListEl.innerHTML = habit.earnedBadges.map(badge => `
                    <div class="badge-row">
                        <span class="badge-name">${this.formatBadgeDisplay(badge)}</span>
                        <span class="badge-date">${this.formatBadgeDate(new Date(badge.earnedAt))}</span>
                    </div>
                `).join('');
            }
        }
        modal.classList.add('active');
    }

    closeBadgesModal() {
        const modal = document.getElementById('badgesModal');
        if (modal) modal.classList.remove('active');
    }

    closeAllModals() {
        this.closeHabitModal();
        this.closeOccurrenceModal();
        this.closeDeleteModal();
        this.closeBadgesModal();
        this.closeDeleteOccurrenceModal();
    }

    // Form Handlers
    handleHabitSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('habitName').value.trim();
        const startDate = document.getElementById('startDate').value;
        const category = document.getElementById('habitCategory').value;
        if (!name || !startDate) return;

        if (this.currentEditId) {
            this.updateHabit(this.currentEditId, name, startDate, category);
        } else {
            this.addHabit(name, startDate, category);
        }
        this.closeHabitModal();
    }

    handleOccurrenceSubmit(e) {
        e.preventDefault();
        const habitId = document.getElementById('occurrenceHabitId').value;
        const date = document.getElementById('occurrenceDate').value;
        const notes = document.getElementById('occurrenceNotes').value.trim();
        if (!habitId || !date) return;
        this.addOccurrence(habitId, date, notes);
        this.closeOccurrenceModal();
    }

    confirmDelete() {
        if (this.currentDeleteId) {
            this.deleteHabit(this.currentDeleteId);
            this.closeDeleteModal();
        }
    }

    confirmDeleteOccurrence() {
        const confirmBtn = document.getElementById('confirmDeleteOccurrenceBtn');
        if (confirmBtn && confirmBtn.dataset.habitId && confirmBtn.dataset.occurrenceId) {
            this.deleteOccurrence(confirmBtn.dataset.habitId, confirmBtn.dataset.occurrenceId);
            this.closeDeleteOccurrenceModal();
        }
    }

    // Utility
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    formatBadgeDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMotivationalMessage() {
        const messageEl = document.getElementById('motivationalMessage');
        const messageText = document.getElementById('messageText');
        const randomMessage = this.motivationalMessages[
            Math.floor(Math.random() * this.motivationalMessages.length)
        ];
        messageText.textContent = randomMessage;
        messageEl.classList.add('show');
        setTimeout(() => messageEl.classList.remove('show'), 3000);
    }

    startStreakUpdater() {
        setInterval(() => {
            this.habits.forEach(habit => {
                const previousBadgeCount = habit.earnedBadges.length;
                this.updateStreakAndBadges(habit);
                if (habit.earnedBadges.length > previousBadgeCount) {
                    this.showMotivationalMessage();
                }
            });
            this.saveToStorage();
            this.render();
            this.updateStats();
        }, 60000);
    }

    triggerImport() {
        const importFile = document.getElementById('importFile');
        if (importFile) importFile.click();
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = this.importData(e.target.result, 'replace');
            if (result.success) this.showMotivationalMessage();
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    exportData() {
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            habits: this.habits
        };
        const filename = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateUniqueId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    importData(fileContent, mode = 'replace') {
        let currentBackup;
        try {
            const importData = JSON.parse(fileContent);
            if (!importData.habits || !Array.isArray(importData.habits)) {
                throw new Error('Invalid backup file format');
            }
            currentBackup = [...this.habits];
            if (mode === 'replace') this.habits = [];

            const importedHabits = importData.habits.map(habit => {
                const newHabit = { ...habit };
                newHabit.id = this.generateUniqueId();
                if (!newHabit.category) newHabit.category = 'other';
                if (newHabit.occurrences && Array.isArray(newHabit.occurrences)) {
                    newHabit.occurrences = newHabit.occurrences.map(occ => ({
                        ...occ, id: this.generateUniqueId()
                    }));
                } else {
                    newHabit.occurrences = [];
                }
                if (!newHabit.currentStreakStart) newHabit.currentStreakStart = newHabit.startDate;
                if (!newHabit.earnedBadges) newHabit.earnedBadges = [];
                return newHabit;
            });

            this.habits.push(...importedHabits);
            this.habits.forEach(habit => this.updateStreakAndBadges(habit));
            this.saveToStorage();
            this.render();
            this.updateStats();
            return { success: true, importedCount: importedHabits.length };
        } catch (error) {
            if (currentBackup) {
                this.habits = currentBackup;
                this.saveToStorage();
                this.render();
                this.updateStats();
            }
            return { success: false, error: error.message };
        }
    }
}

let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new HabitTracker();
});
