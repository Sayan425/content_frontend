import { supabase } from '../supabaseClient.js';
import { showCustomAlert } from './notifications.js';

export function initHomeAnalytics() {
    let rawPosts = [];
    let currentAvatarId = localStorage.getItem('activeAvatarId');
    let charts = {};
    
    // UI Elements
    const kpiPosts = document.getElementById('kpi-posts');
    const kpiImpressions = document.getElementById('kpi-impressions');
    const kpiFollowers = document.getElementById('kpi-followers');
    const kpiEngagements = document.getElementById('kpi-engagements');
    
    const platformFilter = document.getElementById('analytics-platform-filter');
    const dateFilter = document.getElementById('analytics-date-filter');
    const customDateContainer = document.getElementById('custom-date-container');
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');
    const btnApplyDates = document.getElementById('btn-apply-dates');
    
    const sortTopPosts = document.getElementById('sort-top-posts');
    const topPostsGrid = document.getElementById('top-posts-grid');
    const btnShowMorePosts = document.getElementById('btn-show-more-posts');
    
    let visiblePostsCount = 5;
    let filteredPosts = [];
    let followerViewMode = 'cumulative';
    let globalActivePlatforms = [];
    
    // Toggle Elements
    const toggleCumulative = document.getElementById('toggle-cumulative');
    const toggleDaily = document.getElementById('toggle-daily');

    async function loadData() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            if (!userId) throw new Error('Not authenticated');

            // Fetch avatar details for followers
            let avatarQuery = supabase.from('avatar_details').select('*').eq('owner_user_id', userId);
            if (currentAvatarId) avatarQuery = avatarQuery.eq('avatar_id', currentAvatarId);
            
            const { data: avatars, error: avatarError } = await avatarQuery;
            if (avatarError) throw avatarError;
            
            const avatar = avatars?.[0];

            // Calculate total followers from JSON if it exists
            let totalFollowers = 0;
            const allPlatforms = ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'linkedin'];
            let followerHistoryData = {};
            globalActivePlatforms = [];
            
            if (avatar) {
                // Determine active platforms based on social_accounts
                let socialAccounts = {};
                try {
                    socialAccounts = typeof avatar.social_accounts === 'string' ? JSON.parse(avatar.social_accounts) : (avatar.social_accounts || {});
                } catch(e) {}
                
                globalActivePlatforms = allPlatforms.filter(p => socialAccounts[p] && socialAccounts[p].trim() !== "");
                
                // Populate platform filter dynamically
                const currentSelection = platformFilter.value;
                platformFilter.innerHTML = '<option value="all">All Platforms</option>';
                globalActivePlatforms.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p;
                    opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                    platformFilter.appendChild(opt);
                });
                // Restore selection if still valid
                if (currentSelection === 'all' || globalActivePlatforms.includes(currentSelection)) {
                    platformFilter.value = currentSelection;
                } else {
                    platformFilter.value = 'all';
                }

                globalActivePlatforms.forEach(platform => {
                    const historyCol = `${platform}_follower_history`;
                    // Need to parse stringified JSON arrays if necessary
                    let history = [];
                    if (avatar[historyCol]) {
                        try {
                            history = typeof avatar[historyCol] === 'string' ? JSON.parse(avatar[historyCol]) : avatar[historyCol];
                        } catch(e) {}
                    }
                    if (Array.isArray(history) && history.length > 0) {
                        followerHistoryData[platform] = history;
                    } else {
                        followerHistoryData[platform] = [];
                    }
                });
            }

            // Fetch posts
            let postsQuery = supabase.from('published_posts').select('*').eq('owner_user_id', userId);
            if (currentAvatarId) postsQuery = postsQuery.eq('owner_avatar_id', currentAvatarId);
            
            const { data: posts, error: postsError } = await postsQuery;
            if (postsError) throw postsError;
            
            rawPosts = posts || [];
            
            applyFiltersAndRender(followerHistoryData);

        } catch (error) {
            console.error('Error loading analytics:', error);
            await showCustomAlert(`Failed to load analytics: ${error.message}`, 'Error');
        }
    }

    // Turn a yyyy-mm-dd input value into the last millisecond of that day so
    // custom ranges include the whole end date.
    const endOfDay = (value) => {
        const d = new Date(value);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    function applyFiltersAndRender(followerHistoryData) {
        const platform = platformFilter.value;
        const dateRange = dateFilter.value;
        
        // Filter by platform
        filteredPosts = rawPosts;
        if (platform !== 'all') {
            filteredPosts = filteredPosts.filter(p => p.platform === platform);
        }
        
        // Filter by date
        const now = new Date();
        let cutoff = new Date(0);
        
        if (dateRange === '1w') {
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (dateRange === '1m') {
            cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        } else if (dateRange === '2m') {
            cutoff = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
        } else if (dateRange === '3m') {
            cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        } else if (dateRange === 'custom') {
            if (dateStart.value) cutoff = new Date(dateStart.value);
            if (dateEnd.value) {
                // Include the whole end day, not just midnight of it
                const end = new Date(dateEnd.value);
                end.setHours(23, 59, 59, 999);
                filteredPosts = filteredPosts.filter(p => new Date(p.posted_at) <= end);
            }
        }
        
        filteredPosts = filteredPosts.filter(p => new Date(p.posted_at) >= cutoff);
        
        // Update KPIs
        kpiPosts.textContent = filteredPosts.length.toLocaleString();
        
        const totalImp = filteredPosts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
        kpiImpressions.textContent = totalImp.toLocaleString();
        
        let totalEngagements = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalSaves = 0;
        
        filteredPosts.forEach(p => {
            const e = parseInt(p.likes || 0) + parseInt(p.comments || 0) + parseInt(p.shares || 0) + parseInt(p.saves || 0) + parseInt(p.reposts || 0);
            totalEngagements += e;
            totalLikes += parseInt(p.likes || 0);
            totalComments += parseInt(p.comments || 0);
            totalShares += parseInt(p.shares || 0);
            totalSaves += parseInt(p.saves || 0);
        });
        kpiEngagements.textContent = totalEngagements.toLocaleString();
        
        // Update legend
        const getPct = (val) => totalEngagements > 0 ? Math.round((val / totalEngagements) * 100) + '%' : '0%';
        
        document.getElementById('legend-likes').textContent = `Likes: ${getPct(totalLikes)} (${totalLikes.toLocaleString()})`;
        document.getElementById('legend-comments').textContent = `Comments: ${getPct(totalComments)} (${totalComments.toLocaleString()})`;
        document.getElementById('legend-shares').textContent = `Shares: ${getPct(totalShares)} (${totalShares.toLocaleString()})`;
        document.getElementById('legend-saves').textContent = `Saves: ${getPct(totalSaves)} (${totalSaves.toLocaleString()})`;

        // Filter history data by cutoff
        let filteredHistoryData = {};
        let filteredFollowersGained = 0;
        
        Object.keys(followerHistoryData).forEach(plat => {
            if (platform === 'all' || platform === plat) {
                const historyForPlatform = followerHistoryData[plat].filter(entry => new Date(entry.date) >= cutoff && new Date(entry.date) <= (dateRange === 'custom' && dateEnd.value ? endOfDay(dateEnd.value) : now));
                filteredHistoryData[plat] = historyForPlatform;
                
                if (historyForPlatform.length > 0) {
                    const latestFollowers = parseInt(historyForPlatform[historyForPlatform.length - 1].followers || 0);
                    
                    // Find the last entry before the cutoff date to accurately calculate "gained"
                    const beforeCutoffEntries = followerHistoryData[plat].filter(entry => new Date(entry.date) < cutoff);
                    const baselineFollowers = beforeCutoffEntries.length > 0 
                        ? parseInt(beforeCutoffEntries[beforeCutoffEntries.length - 1].followers || 0) 
                        : parseInt(historyForPlatform[0].followers || 0);
                        
                    filteredFollowersGained += (latestFollowers - baselineFollowers);
                }
            } else {
                filteredHistoryData[plat] = [];
            }
        });
        
        kpiFollowers.textContent = (filteredFollowersGained > 0 ? '+' : '') + filteredFollowersGained.toLocaleString();

        renderCharts(filteredHistoryData, platform, { totalLikes, totalComments, totalShares, totalSaves }, cutoff, (dateRange === 'custom' && dateEnd.value ? endOfDay(dateEnd.value) : now));
        
        // Ensure Top Posts renders on first load
        renderTopPosts();
    }

    function renderCharts(historyData, selectedPlatform, engagementBreakdown, startDate, endDate) {
        // Destroy old charts
        if (charts.follower) charts.follower.destroy();
        if (charts.radar) charts.radar.destroy();
        if (charts.donut) charts.donut.destroy();
        
        Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
        Chart.defaults.font.family = 'Inter';

        // 1. Follower History
        const platformColors = {
            'tiktok': '#00f2fe',
            'instagram': '#e1306c',
            'youtube': '#ff0000',
            'linkedin': '#0a66c2',
            'twitter': '#1da1f2',
            'facebook': '#1877f2'
        };

        // Extract dates and create a unified daily timeline for the entire duration
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        let timelineDates = [];
        let labels = [];
        
        // Always generate daily points so the lines show day-to-day data
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            let dateStr = d.toISOString().split('T')[0];
            timelineDates.push(dateStr);
            labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        
        let datasets = [];
        
        const createDataset = (plat) => {
            // Map the timeline dates to data points
            // For each point on the timeline, find the last known follower count on or before that date
            let lastVal = null;
            
            let previousEntryVal = null;
            
            // First, find if there is a known value before the start date to carry over
            if (rawPosts) {
                // Assuming followerHistoryData (the unfiltered one) has earlier entries, but we only have historyData here.
                // We'll just look at historyData and grab the first one, or use a default.
                if (historyData[plat].length > 0) {
                    lastVal = historyData[plat][0].followers;
                }
            }

            const dataPoints = timelineDates.map(dateStr => {
                const targetDate = new Date(dateStr);
                
                // Find the entry that is closest to but not after the targetDate
                let applicableEntry = null;
                for (let entry of historyData[plat]) {
                    if (new Date(entry.date) <= targetDate) {
                        applicableEntry = entry;
                    } else {
                        break; // Since historyData is assumed chronologically sorted
                    }
                }
                
                let currentVal = applicableEntry ? applicableEntry.followers : (lastVal || 0);
                
                if (followerViewMode === 'cumulative') {
                    lastVal = currentVal;
                    return currentVal;
                } else {
                    if (previousEntryVal === null) {
                        previousEntryVal = currentVal;
                        return 0; // Initial day has no growth relative to itself
                    } else {
                        let diff = currentVal - previousEntryVal;
                        previousEntryVal = currentVal;
                        return diff;
                    }
                }
            });
            
            return {
                label: plat.charAt(0).toUpperCase() + plat.slice(1),
                data: dataPoints,
                borderColor: platformColors[plat] || '#d0bcff',
                backgroundColor: (platformColors[plat] || '#d0bcff') + '33',
                tension: 0, // Sharp lines
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 0,
                pointBackgroundColor: platformColors[plat] || '#d0bcff',
                pointBorderColor: '#131313',
                pointBorderWidth: 2,
                spanGaps: true
            };
        };

        if (selectedPlatform === 'all') {
            Object.keys(historyData).forEach(plat => {
                if (historyData[plat].length > 0) {
                    let ds = createDataset(plat);
                    ds.fill = false;
                    datasets.push(ds);
                }
            });
        } else {
            if (historyData[selectedPlatform] && historyData[selectedPlatform].length > 0) {
                let ds = createDataset(selectedPlatform);
                ds.fill = true;
                datasets.push(ds);
            }
        }
        
        if (datasets.length === 0) {
             datasets.push({
                label: 'Followers',
                data: labels.map(() => 0),
                borderColor: '#d0bcff',
                tension: 0
            });
        }

        const ctxFollower = document.getElementById('chart-follower-history').getContext('2d');
        charts.follower = new Chart(ctxFollower, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'top', 
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 20,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(20, 20, 20, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbc3d7',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    y: { 
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }, 
                        beginAtZero: false, // Auto-adjust spacing
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            padding: 10
                        }
                    },
                    x: { 
                        grid: { display: false, drawBorder: false },
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            padding: 10,
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 15 // Automatically skip labels on x-axis so it doesn't get crowded
                        }
                    }
                },
                interaction: { mode: 'index', intersect: false }
            }
        });

        // 2. Engagement Donut
        const ctxDonut = document.getElementById('chart-engagement-donut').getContext('2d');
        charts.donut = new Chart(ctxDonut, {
            type: 'pie',
            data: {
                labels: ['Likes', 'Comments', 'Shares', 'Saves'],
                datasets: [{
                    data: [
                        engagementBreakdown.totalLikes,
                        engagementBreakdown.totalComments,
                        engagementBreakdown.totalShares,
                        engagementBreakdown.totalSaves
                    ],
                    backgroundColor: ['#6d3bd7', '#03b5d3', '#ff516a', '#8553f4'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: 0,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                const total = context.chart._metasets[context.datasetIndex].total;
                                const percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
                                return `${context.label}: ${value.toLocaleString()} (${percentage})`;
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'innerBorders',
                afterDraw(chart) {
                    const ctx = chart.ctx;
                    const meta = chart.getDatasetMeta(0);
                    if (!meta.data || !meta.data.length) return;
                    
                    ctx.save();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    
                    meta.data.forEach(arc => {
                        // Skip if slice has no value
                        if (arc.circumference === 0) return;
                        
                        const center = { x: arc.x, y: arc.y };
                        const angle = arc.startAngle;
                        // Use outerRadius + hover offset if active, otherwise just outerRadius
                        const radius = arc.active ? arc.outerRadius + 8 : arc.outerRadius;
                        
                        const x = center.x + Math.cos(angle) * radius;
                        const y = center.y + Math.sin(angle) * radius;
                        
                        ctx.beginPath();
                        ctx.moveTo(center.x, center.y);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    });
                    ctx.restore();
                }
            }]
        });

        // 3. Platform Radar
        const ctxRadar = document.getElementById('chart-platform-radar').getContext('2d');
        
        // Calculate averages per platform, only for active platforms
        const radarPlatforms = globalActivePlatforms;
        
        if (radarPlatforms.length === 0) {
            charts.radar = new Chart(ctxRadar, {
                type: 'radar',
                data: { labels: ['No Data'], datasets: [] }
            });
        } else {
            // Calculate two datasets: Avg Engagement and Avg Impressions
            let maxEng = 1;
            let maxImp = 1;
            
            const rawEngData = radarPlatforms.map(plat => {
                const platPosts = rawPosts.filter(p => p.platform === plat);
                if (platPosts.length === 0) return 0;
                const totalE = platPosts.reduce((sum, p) => sum + parseInt(p.likes || 0) + parseInt(p.comments || 0) + parseInt(p.shares || 0) + parseInt(p.saves || 0), 0);
                return totalE / platPosts.length;
            });
            
            const rawImpData = radarPlatforms.map(plat => {
                const platPosts = rawPosts.filter(p => p.platform === plat);
                if (platPosts.length === 0) return 0;
                const totalI = platPosts.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
                return totalI / platPosts.length;
            });
            
            maxEng = Math.max(1, ...rawEngData);
            maxImp = Math.max(1, ...rawImpData);
            
            // Instead of normalizing with an arbitrary power curve, we map the raw data directly 
            // into a log base 10 scale for the visual chart (Log10(x + 1)). 
            // This natively acts as a logarithmic scale without distorting raw truths.
            const radarEngData = rawEngData.map(v => Math.log10(v + 1));
            const radarImpData = rawImpData.map(v => Math.log10(v + 1));

            charts.radar = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: radarPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
                    datasets: [
                        {
                            label: 'Avg Engagement',
                            data: radarEngData,
                            backgroundColor: 'rgba(76, 215, 246, 0.2)',
                            borderColor: '#4cd7f6',
                            pointBackgroundColor: '#4cd7f6',
                            borderWidth: 2
                        },
                        {
                            label: 'Avg Impressions',
                            data: radarImpData,
                            backgroundColor: 'rgba(208, 188, 255, 0.2)',
                            borderColor: '#d0bcff',
                            pointBackgroundColor: '#d0bcff',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { color: 'rgba(255,255,255,0.6)', font: { size: 12 } },
                            ticks: { display: false } // Hide log tick numbers for cleaner look
                        }
                    },
                    plugins: { 
                        legend: { labels: { color: 'white' } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    // Fetch the true raw data from our arrays instead of the log mapped value
                                    const rawValue = context.datasetIndex === 0 ? rawEngData[context.dataIndex] : rawImpData[context.dataIndex];
                                    return context.dataset.label + ': ' + Math.round(rawValue).toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            
            // Highlight logic
            if (selectedPlatform !== 'all' && radarPlatforms.includes(selectedPlatform)) {
                const idx = radarPlatforms.indexOf(selectedPlatform);
                const metaEng = charts.radar.getDatasetMeta(0);
                const metaImp = charts.radar.getDatasetMeta(1);
                
                [metaEng, metaImp].forEach(meta => {
                    if (meta && meta.data[idx]) {
                        meta.data.forEach((pt, i) => {
                            if (i === idx) {
                                pt.options.radius = 6;
                                pt.options.backgroundColor = '#fff';
                            } else {
                                pt.options.radius = 2;
                            }
                        });
                    }
                });
                charts.radar.update();
            }
        }
    }

    function renderTopPosts() {
        const sortBy = sortTopPosts.value;
        
        // Sort descending
        let postsToRender = [];
        
        if (sortBy === 'recent') {
            postsToRender = [...filteredPosts].sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
        } else {
            postsToRender = [...filteredPosts].sort((a, b) => parseFloat(b[sortBy] || 0) - parseFloat(a[sortBy] || 0));
        }
        postsToRender = postsToRender.slice(0, visiblePostsCount);
        
        topPostsGrid.innerHTML = '';
        
        if (postsToRender.length === 0) {
            topPostsGrid.innerHTML = `<div class="col-span-full py-8 text-center text-white/40">No posts found for these filters.</div>`;
            btnShowMorePosts.classList.add('hidden');
            return;
        }

        let html = '';
        
        const platformLogos = {
            'tiktok': 'https://cdn.simpleicons.org/tiktok/000000', // tiktok black/white
            'instagram': 'https://cdn.simpleicons.org/instagram/e1306c',
            'youtube': 'https://cdn.simpleicons.org/youtube/ff0000',
            'linkedin': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
            'twitter': 'https://cdn.simpleicons.org/x/000000',
            'facebook': 'https://cdn.simpleicons.org/facebook/1877f2'
        };

        postsToRender.forEach((post, i) => {
            let logoUrl = platformLogos[post.platform] || 'https://cdn.simpleicons.org/internetarchive/ffffff';
            // Fallback for dark theme platforms
            if (post.platform === 'tiktok' || post.platform === 'twitter') {
                logoUrl = `https://cdn.simpleicons.org/${post.platform === 'twitter' ? 'x' : 'tiktok'}/ffffff`;
            }

            html += `
                <a href="${post.post_url || '#'}" onclick="window.open(this.href, 'newwindow', 'width=1000, height=800'); return false;" class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all shadow-lg group flex flex-col cursor-pointer hover:-translate-y-1">
                    <div class="h-32 bg-surface-container relative flex items-center justify-center border-b border-white/10">
                        <img src="${logoUrl}" class="w-10 h-10 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 drop-shadow-md" alt="${post.platform} logo">
                        <div class="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur border border-white/10 flex items-center justify-center font-bold text-[10px] text-white">#${i + 1}</div>
                    </div>
                    <div class="p-4 flex flex-col gap-3 flex-1">
                        <div class="text-[10px] text-white/40 font-mono-label flex justify-between items-center">
                            <span class="uppercase">${post.platform}</span>
                            <span>${new Date(post.posted_at).toLocaleDateString()}</span>
                        </div>
                        <p class="text-sm text-white font-medium line-clamp-2 leading-snug">${post.caption}</p>
                        <div class="mt-auto pt-3 border-t border-white/5 grid grid-cols-2 gap-y-2 gap-x-1">
                            <div class="flex items-center gap-1.5 text-white/60">
                                <span class="material-symbols-outlined text-[14px]">visibility</span>
                                <span class="text-xs font-mono-label">${post.impressions?.toLocaleString() || 0}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-white/60">
                                <span class="material-symbols-outlined text-[14px]">favorite</span>
                                <span class="text-xs font-mono-label">${post.likes?.toLocaleString() || 0}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-white/60">
                                <span class="material-symbols-outlined text-[14px]">share</span>
                                <span class="text-xs font-mono-label">${post.shares?.toLocaleString() || 0}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-white/60">
                                <span class="material-symbols-outlined text-[14px]">chat_bubble</span>
                                <span class="text-xs font-mono-label">${post.comments?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        });
        
        topPostsGrid.innerHTML = html;

        const btnShowLessPosts = document.getElementById('btn-show-less-posts');

        if (visiblePostsCount < filteredPosts.length) {
            btnShowMorePosts.classList.remove('hidden');
        } else {
            btnShowMorePosts.classList.add('hidden');
        }

        if (visiblePostsCount > 5) {
            btnShowLessPosts.classList.remove('hidden');
        } else {
            btnShowLessPosts.classList.add('hidden');
        }
    }

    // Event Listeners
    platformFilter.addEventListener('change', () => loadData());
    
    dateFilter.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDateContainer.classList.remove('hidden');
            customDateContainer.classList.add('flex');
        } else {
            customDateContainer.classList.add('hidden');
            customDateContainer.classList.remove('flex');
            loadData();
        }
    });

    btnApplyDates.addEventListener('click', () => loadData());
    
    sortTopPosts.addEventListener('change', () => {
        visiblePostsCount = 5;
        renderTopPosts();
    });
    
    // Toggle Listeners
    toggleCumulative.addEventListener('click', () => {
        if(followerViewMode === 'cumulative') return;
        followerViewMode = 'cumulative';
        toggleCumulative.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
        toggleCumulative.classList.remove('text-white/60', 'hover:text-white');
        toggleDaily.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        toggleDaily.classList.add('text-white/60', 'hover:text-white');
        loadData();
    });

    toggleDaily.addEventListener('click', () => {
        if(followerViewMode === 'daily') return;
        followerViewMode = 'daily';
        toggleDaily.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
        toggleDaily.classList.remove('text-white/60', 'hover:text-white');
        toggleCumulative.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
        toggleCumulative.classList.add('text-white/60', 'hover:text-white');
        loadData();
    });

    btnShowMorePosts.addEventListener('click', () => {
        visiblePostsCount += 5;
        renderTopPosts();
    });

    const btnShowLessPosts = document.getElementById('btn-show-less-posts');
    if (btnShowLessPosts) {
        btnShowLessPosts.addEventListener('click', () => {
            visiblePostsCount = Math.max(5, visiblePostsCount - 5);
            renderTopPosts();
        });
    }

    // Start
    loadData();
}
