/* ================================================
   CONSTANTS
================================================ */
const MAP_ICONS = {
	'Cache': 'https://images.steamusercontent.com/ugc/1925880768496712192/65E5476B6E4AD2D7590D0F05A9E9862AB4D91CF5/',
	'Mirage': 'https://images.steamusercontent.com/ugc/1925880768496712238/552E501FE5F3FE8737E47B522BEA42917C6C8115/',
	'Nuke': 'https://images.steamusercontent.com/ugc/1925880768496712259/6843AB959CD7429BAD5F24F65564976BCCA01EF1/',
	'Overpass': 'https://images.steamusercontent.com/ugc/1925880768496712266/C255441DBF76005D97A6828D603EE11427C3F036/',
	'Inferno': 'https://images.steamusercontent.com/ugc/1925880768496712223/40D1BBCFD43EC03C32FDADD5C7CC9D2DA87656BE/',
	'Dust2': 'https://images.steamusercontent.com/ugc/1925880768496712216/1317E023968736913EF8D2762C99AEB2B70DF541/',
	'Cobblestone': 'https://images.steamusercontent.com/ugc/1925880768496712201/0168C5F7C4EE569635B8682CD5D25B3F2AD36D9A/',
	'Train': 'https://images.steamusercontent.com/ugc/1925880768496712290/72A3D2CFB357BC00A2E7944A87B46911EEE10177/',
	'Vertigo': 'https://images.steamusercontent.com/ugc/1925880768496712295/EDCA7C5B6778591AD35A9E3A755B25249BD9F237/',
};

const PIE_COLORS = [
	'#FCAC19', '#4a8fc9', '#e05555', '#5ec98c', '#a06de0',
	'#e07b2a', '#50c8c8', '#c96a9f', '#8fb040'
];

// Shared chart layout
const CM = {
	top: 20,
	right: 32,
	bottom: 0,
	left: 52
};
const INNER_H = 260,
	ICON_SIZE = 40,
	ICON_PAD = 6;
const BOTTOM_SP = ICON_PAD + ICON_SIZE + 16 + 14;
const CHART_H = CM.top + INNER_H + BOTTOM_SP + 8;
const BAR_COL_W = 96,
	BAR_PAD = 0.38;

const didAnimate = {
	0: false,
	1: false,
	2: false,
	4: false
};

let G = {
	mapData: [],
	sideData: [],
	pieData: [],
	timeData: []
};

/* ================================================
   TOOLTIP
================================================ */
const TT = document.getElementById('tooltip');

function showTT(ev, html) {
	TT.style.opacity = '1';
	TT.innerHTML = html;
	TT.style.left = (ev.clientX + 16) + 'px';
	TT.style.top = (ev.clientY - 12) + 'px';
}

function hideTT() {
	TT.style.opacity = '0';
}

/* ================================================
   TABS
================================================ */
function switchTab(idx) {
	document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
	document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
	if (idx === 0 && !didAnimate[0]) {
		didAnimate[0] = true;
		renderTab0(G.mapData);
	}
	if (idx === 1 && !didAnimate[1]) {
		didAnimate[1] = true;
		renderTab1(G.sideData);
	}
	if (idx === 2 && !didAnimate[4]) {
		didAnimate[4] = true;
		renderTab4(G.timeData);
	}
	if (idx === 3 && !didAnimate[2]) {
		didAnimate[2] = true;
		renderTab2(G.pieData);
	}
}

/* ================================================
   HELPERS
================================================ */
function getIcon(mapName) {
	if (!mapName) return null;
	const k = Object.keys(MAP_ICONS).find(k => k.toLowerCase() === mapName.toLowerCase());
	return k ? MAP_ICONS[k] : null;
}

function validMapScore(row, m) {
	const mn = row[`M${m}`],
		s1 = row[`first_team_score_M${m}`],
		s2 = row[`second_team_score_M${m}`];
	if (!mn || mn === '-' || mn === '') return false;
	if (!s1 || !s2 || s1 === '-' || s2 === '-') return false;
	return !isNaN(parseInt(s1)) && !isNaN(parseInt(s2));
}

// Draw map icons
function addIcons(g, data, xScale, yPos) {
	data.forEach(d => {
		const url = getIcon(d.map);
		if (!url) return;
		const cx = xScale(d.map) + xScale.bandwidth() / 2;
		g.append('image')
			.attr('href', url)
			.attr('x', cx - ICON_SIZE / 2)
			.attr('y', yPos)
			.attr('width', ICON_SIZE)
			.attr('height', ICON_SIZE)
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.style('pointer-events', 'none');
	});
}

// Build consistent SVG
function buildScaffold(id, domainArr) {
	const cont = document.getElementById(id);
	cont.innerHTML = '';
	const totalW = Math.max(cont.offsetWidth || 900, domainArr.length * BAR_COL_W + CM.left + CM.right);
	const innerW = totalW - CM.left - CM.right;
	const svg = d3.select('#' + id).append('svg')
		.attr('width', totalW)
		.attr('height', CHART_H);
	const g = svg.append('g')
		.attr('transform', `translate(${CM.left},${CM.top})`);
	const x = d3.scaleBand().domain(domainArr).range([0, innerW]).padding(BAR_PAD);
	return {svg,g,x,innerW};
}

// Dashed red reference lines
function addRedRef(g, yScale, yVal, innerW, label) {
	const yy = yScale(yVal);
	g.append('line')
		.attr('x1', 0).attr('x2', innerW)
    .attr('y1', yy).attr('y2', yy)
		.attr('stroke', '#e05555')
    .attr('stroke-width', 1.5)
		.attr('stroke-dasharray', '6,4')
    .attr('opacity', 0.85);

	g.append('text')
		.attr('x', innerW + 4)
    .attr('y', yy - 3)
		.attr('font-family', 'Share Tech Mono')
    .attr('font-size', 9)
		.attr('fill', '#e05555')
    .attr('opacity', 0.9)
		.text(label);
}

function triggerFadeUp(el) {
	el.classList.remove('do-fade-up');
	void el.offsetWidth;
	el.classList.add('do-fade-up');
}

/* ================================================
   PARSE CSV
================================================ */
function parseAll(csvText) {
	const rows = d3.csvParse(csvText);
	const ms = {},
		ss = {},
		ps = {};

	rows.forEach(row => {
		const r1 = parseFloat(row['first_team_world_rank_#']),
			r2 = parseFloat(row['second_team_world_rank_#']);
		const favFirst = (!isNaN(r1) && !isNaN(r2) && r1 !== r2) ? (r1 < r2) : null;

		for (let m = 1; m <= 3; m++) {
			if (!validMapScore(row, m)) continue;
			const mn = row[`M${m}`].trim();
			const s1 = parseInt(row[`first_team_score_M${m}`]),
				s2 = parseInt(row[`second_team_score_M${m}`]);

			if (favFirst !== null) {
				if (!ms[mn]) ms[mn] = {
					expected: 0,
					total: 0
				};
				ms[mn].total++;
				if ((favFirst && s1 > s2) || (!favFirst && s1 < s2)) ms[mn].expected++;
			}

			const sf = (row[`side_first_team_M${m}`] || '').trim().toUpperCase();
			const sf2 = (row[`side_second_team_M${m}`] || '').trim().toUpperCase();
			const ft1 = parseInt(row[`score_first_team_t1_M${m}`]),
				ft2 = parseInt(row[`score_first_team_t2_M${m}`]);
			const st1 = parseInt(row[`score_second_team_t1_M${m}`]),
				st2 = parseInt(row[`score_second_team_t2_M${m}`]);
			if (sf && sf2 && ![ft1, ft2, st1, st2].some(v => isNaN(v))) {
				let ct = 0,
					t = 0;
				if (sf === 'CT') {
					ct += ft1;
					t += st1;
				} else if (sf === 'T') {
					t += ft1;
					ct += st1;
				}
				if (sf2 === 'CT') {
					ct += ft2;
					t += st2;
				} else if (sf2 === 'T') {
					t += ft2;
					ct += st2;
				}
				if (!ss[mn]) ss[mn] = {
					ct: 0,
					t: 0,
					maps: 0
				};
				ss[mn].ct += ct;
				ss[mn].t += t;
				ss[mn].maps++;
			}
		}

		const allSlots = ['ban 1', 'ban 2', 'ban 3', 'ban 4', 'pick 1', 'pick 2', 'pick 3'];
		const pool = new Set();
		allSlots.forEach(col => {
			const v = (row[col] || '').trim();
			if (v && v !== '-' && v !== '') pool.add(v);
		});
		if (pool.size < 5) return;
		const ban1 = (row['ban 1'] || '').trim(),
			pick3 = (row['pick 3'] || '').trim();
		pool.forEach(mn => {
			if (!ps[mn]) ps[mn] = {
				appearances: 0,
				ban1: 0,
				pick3: 0
			};
			ps[mn].appearances++;
			if (mn === ban1) ps[mn].ban1++;
			if (mn === pick3) ps[mn].pick3++;
		});
	});

	const mapData = Object.entries(ms).filter(([, v]) => v.total >= 5)
		.map(([map, v]) => ({
			map,
			pct: Number(((v.expected / v.total) * 100).toFixed(3)),
			expected: v.expected,
			total: v.total
		}))
		.sort((a, b) => b.pct - a.pct);

	const sideData = Object.entries(ss)
		.filter(([, v]) => v.maps >= 5)
		.map(([map, v]) => {
			const tot = v.ct + v.t;
			return {
				map,
				ct: v.ct,
				t: v.t,
				total: tot,
				ctPct: Number(((v.ct / tot) * 100)
					.toFixed(3)),
				tPct: Number(((v.t / tot) * 100)
					.toFixed(3)),
				maps: v.maps
			};
		})
		.sort((a, b) => b.ctPct - a.ctPct);

	const pieData = Object.entries(ps)
		.filter(([, v]) => v.appearances >= 5)
		.map(([map, v]) => ({
			map,
			appearances: v.appearances,
			ban1Rate: Number(((v.ban1 / v.appearances) * 100)
				.toFixed(3)),
			pick3Rate: Number(((v.pick3 / v.appearances) * 100)
				.toFixed(3)),
			ban1Count: v.ban1,
			pick3Count: v.pick3
		}));

	return {
		mapData,
		sideData,
		pieData,
		totalRows: rows.length,
		timeData: parseTimeData(rows)
	};
}

/* ================================================
   PARSE TIME DATA — matches per year-month
================================================ */
function parseTimeData(rows) {
	const counts = {};

	rows.forEach(row => {
		const raw = (row.date || row.Date || '').trim();
		if (!raw) return;

		const key = raw.slice(0, 7);

		counts[key] = (counts[key] || 0) + 1;
	});

	return Object.entries(counts)
		.map(([key, count]) => ({
			key,
			year: Number(key.slice(0, 4)),
			month: Number(key.slice(5, 7)),
			count
		}))
		.sort((a, b) => a.key.localeCompare(b.key));
}

/* =================== TAB 0 =================== */
function renderTab0(mapData) {
	document.getElementById('pills-0').style.display = 'flex';
	document.getElementById('leg0').style.display = 'flex';
	const totalPlays = mapData.reduce((s, d) => s + d.total, 0);
	const avgUpset = (mapData.reduce((s, d) => s + (100 - d.pct), 0) / mapData.length).toFixed(1);
	document.getElementById('p0-total').textContent = totalPlays.toLocaleString() + ' maps';

	const avgPct = Number((mapData.reduce((s, d) => s + d.pct, 0) / mapData.length).toFixed(3));
	const fullData = [...mapData, {
		map: 'Average',
		pct: avgPct,
		expected: null,
		total: null,
		isAvg: true
	}];

	const {
		svg,
		g,
		x,
		innerW
	} = buildScaffold('cc0', fullData.map(d => d.map));
	const minP = d3.min(fullData, d => d.pct),
		maxP = d3.max(fullData, d => d.pct);
	const y = d3.scaleLinear().domain([Math.floor(minP - 5), Math.ceil(maxP + 5)]).range([INNER_H, 0]);

	const defs = svg.append('defs');
	const css = getComputedStyle(document.documentElement);
	const mk = (id, c1, c2) => {
		const gr = defs
			.append('linearGradient')
			.attr('id', id)
			.attr('x1', '0')
			.attr('y1', '0')
			.attr('x2', '0')
			.attr('y2', '1');
		gr
			.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', c1)
			.attr('stop-opacity', 1);
		gr
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', c2)
			.attr('stop-opacity', 0.7);
	};

	mk(
		'g0',
		css.getPropertyValue('--gold').trim(),
		css.getPropertyValue('--gold').trim()
	);

	mk(
		'g0h',
		css.getPropertyValue('--gold').trim(),
		css.getPropertyValue('--navy-light').trim()
	);

	y.ticks(6).forEach(v => {
		g.append('line')
			.attr('class', 'gridline')
			.attr('x1', 0)
			.attr('x2', innerW)
			.attr('y1', y(v))
			.attr('y2', y(v));
	});

	const avgX = x('Average');
	if (avgX !== undefined) g
		.append('line')
		.attr('x1', avgX - x.step() * BAR_PAD / 2)
		.attr('x2', avgX - x.step() * BAR_PAD / 2)
		.attr('y1', 0).attr('y2', INNER_H)
		.attr('stroke', 'var(--border)')
		.attr('stroke-width', 1)
		.attr('stroke-dasharray', '4,3');

	g.append('g')
		.attr('class', 'axis')
		.attr('transform', `translate(0,${INNER_H})`)
		.call(d3.axisBottom(x).tickSize(0))
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dy', ICON_SIZE + ICON_PAD + 16 + 'px')
				.style('text-transform', 'uppercase')
				.style('letter-spacing', '1px');
		});
	g.append('g')
		.attr('class', 'axis')
		.call(d3.axisLeft(y).ticks(6).tickFormat(d => d + '%').tickSize(0))
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dx', '-6px');
		});

	g.selectAll('.br0')
		.data(fullData)
		.join('rect')
		.attr('class', 'br0')
		.attr('x', d => x(d.map))
		.attr('width', x.bandwidth())
		.attr('y', INNER_H)
		.attr('height', 0)
		.attr('rx', 2)
		.attr('fill', d => d.isAvg ? 'var(--average)' : 'url(#g0)')
		.attr('stroke', d => d.isAvg ? 'var(--border)' : 'none')
		.attr('stroke-width', 1)
		.on('mousemove', (ev, d) => {
			if (d.isAvg) {
				showTT(ev, `<strong>ALL-MAP AVERAGE</strong>
                        <div class="t-row">
                          <span>Expected rate</span>
                          <span class="t-val">${d.pct.toFixed(1)}%</span>
                        </div>`);
				return;
			}
			showTT(ev, `<strong>${d.map.toUpperCase()}</strong>
                    <div class="t-row">
                      <span>Expected</span>
                      <span class="t-val">${d.expected}/${d.total}</span>
                    </div>
                    <div class="t-row">
                      <span>Upsets</span>
                      <span class="t-val">${d.total-d.expected} (${(100-d.pct).toFixed(1)}%)</span>
                    </div>`);
			d3.select(ev.currentTarget)
				.attr('fill', 'url(#g0h)');
		})
		.on('mouseleave', ev => {
			hideTT();
			d3.select(ev.currentTarget)
				.attr('fill', d => d.isAvg ? 'var(--average)' : 'url(#g0)')
				.style('filter', 'none');
		})
		.transition().duration(800).delay((d, i) => i * 55).ease(d3.easeCubicOut)
		.attr('y', d => y(d.pct))
		.attr('height', d => INNER_H - y(d.pct));

	g.selectAll('.lbl0')
		.data(fullData)
		.join('text')
		.attr('class', 'bar-label lbl0')
		.attr('x', d => x(d.map) + x.bandwidth() / 2)
		.attr('y', INNER_H)
		.attr('opacity', 0)
		.attr('fill', d => d.isAvg ? 'rgba(240,244,255,0.5)' : 'var(--gold)')
		.text(d => d.pct.toFixed(1) + '%')
		.transition().duration(800).delay((d, i) => i * 55 + 180).ease(d3.easeCubicOut)
		.attr('y', d => y(d.pct) - 7)
		.attr('opacity', 1);

	g.selectAll('.nc0')
		.data(fullData)
		.join('text')
		.attr('class', 'map-count nc0')
		.attr('x', d => x(d.map) + x.bandwidth() / 2)
		.attr('y', INNER_H + ICON_PAD + ICON_SIZE + 28)
		.attr('opacity', 0).text(d => d.isAvg ? '' : ('n=' + d.total))
		.transition().delay((d, i) => i * 55 + 350).duration(350)
		.attr('opacity', 1);
	addRedRef(g, y, avgPct, innerW, avgPct.toFixed(1) + '%');
	addIcons(g, fullData.filter(d => !d.isAvg), x, INNER_H + ICON_PAD);
}

/* =================== TAB 1 =================== */
function renderTab1(sideData) {
	document.getElementById('pills-1').style.display = 'flex';
	document.getElementById('leg1').style.display = 'flex';
	const totalR = sideData.reduce((s, d) => s + d.total, 0);
	document.getElementById('p1-rounds').textContent = totalR.toLocaleString() + ' rounds';

	const allCT = sideData.reduce((s, d) => s + d.ct, 0),
		allT = sideData.reduce((s, d) => s + d.t, 0),
		allTot = allCT + allT;
	const avgCTPct = Number(((allCT / allTot) * 100).toFixed(3)),
		avgTPct = Number(((allT / allTot) * 100).toFixed(3));
	const fullData = [...sideData, {
		map: 'Average',
		ctPct: avgCTPct,
		tPct: avgTPct,
		ct: allCT,
		t: allT,
		total: allTot,
		maps: null,
		isAvg: true
	}];

	const {
		svg,
		g,
		x,
		innerW
	} = buildScaffold('cc1', fullData.map(d => d.map));
	const defs = svg.append('defs');
	const css = getComputedStyle(document.documentElement);
	const mkG = (id, c1, c2) => {
		const gr = defs
			.append('linearGradient')
			.attr('id', id)
			.attr('x1', '0')
			.attr('y1', '0')
			.attr('x2', '0')
			.attr('y2', '1');
		gr
			.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', c1)
			.attr('stop-opacity', 0.95);
		gr
			.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', c2)
			.attr('stop-opacity', 0.85);
	};
	mkG('gCT', css.getPropertyValue('--navy').trim(), css.getPropertyValue('--navy').trim());
	mkG('gCTH', '#90ccf4', '#4a8fc9');
	mkG('gT', css.getPropertyValue('--gold').trim(), css.getPropertyValue('--gold').trim());
	mkG('gTH', '#f0a060', '#e07b2a');

	const y = d3.scaleLinear().domain([0, 100]).range([INNER_H, 0]);
	[25, 50, 75].forEach(v => {
		g.append('line')
			.attr('class', 'gridline')
			.attr('x1', 0)
			.attr('x2', innerW)
			.attr('y1', y(v))
			.attr('y2', y(v));
	});

	const avgX = x('Average');
	if (avgX !== undefined) g.append('line')
		.attr('x1', avgX - x.step() * BAR_PAD / 2)
		.attr('x2', avgX - x.step() * BAR_PAD / 2)
		.attr('y1', 0)
		.attr('y2', INNER_H)
		.attr('stroke', 'var(--border)')
		.attr('stroke-width', 1)
		.attr('stroke-dasharray', '4,3');

	g.append('g')
		.attr('class', 'axis')
		.attr('transform', `translate(0,${INNER_H})`)
		.call(d3.axisBottom(x).tickSize(0))
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dy', ICON_SIZE + ICON_PAD + 16 + 'px')
				.style('text-transform', 'uppercase')
				.style('letter-spacing', '1px');
		});

	g.append('g')
		.attr('class', 'axis')
		.call(d3.axisLeft(y).tickValues([0, 25, 50, 75, 100]).tickFormat(d => d + '%').tickSize(0))
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dx', '-6px');
		});

	function onEnter(ev, d) {
		showTT(ev, d.isAvg ?
      `<strong>ALL-MAP AVERAGE</strong>
      <div class="t-row">
        <span>CT avg</span>
        <span class="t-ct">${d.ctPct.toFixed(1)}%</span>
      </div>
      <div class="t-row">
        <span>T avg</span>
        <span class="t-t">${d.tPct.toFixed(1)}%</span>
      </div>`
      :
			`<strong>${d.map.toUpperCase()}</strong>
      <div class="t-row">
        <span>CT rounds</span>
        <span class="t-ct">${d.ct} (${d.ctPct.toFixed(1)}%)</span>
      </div>
      <div class="t-row">
        <span>T rounds</span>
        <span class="t-t">${d.t} (${d.tPct.toFixed(1)}%)</span>
      </div>
      <div class="t-row">
        <span>Total</span>
        <span class="t-val">${d.total}</span>
      </div>
      <div class="t-row">
        <span>Maps</span>
        <span class="t-val">${d.maps}</span>
      </div>`);

		d3.selectAll('.bCT-' + d.map.replace(/\s/g, '_') + ', .bT-' + d.map.replace(/\s/g, '_'))
			.style('filter', 'brightness(1.15)');
	}

	function onLeave(ev, d) {
		hideTT();
		d3.selectAll('.bCT-' + d.map.replace(/\s/g, '_') + ', .bT-' + d.map.replace(/\s/g, '_'))
			.style('filter', 'none');
	}

  // bar rectangle
	g.selectAll('.bCT')
		.data(fullData)
		.join('rect')
		.attr('class', d => 'bCT bCT-' + d.map.replace(/\s/g, '_'))
		.attr('x', d => x(d.map))
		.attr('width', x.bandwidth())
		.attr('y', 0)
		.attr('height', 0)
		.attr('rx', 2)
		.attr('fill', d => d.isAvg ? 'var(--average)' : 'url(#gCT)')
    .attr('stroke', d => d.isAvg ? 'var(--border)' : 'none')
    .attr('stroke-width', 1)
		.on('mousemove', onEnter)
    .on('mouseleave', onLeave)
    .transition().duration(800).delay((d, i) => i * 55).ease(d3.easeCubicOut)
    .attr('y', 0)
    .attr('height', d => y(100 - d.ctPct));

	g.selectAll('.bT')
		.data(fullData)
		.join('rect')
		.attr('class', d => 'bT bT-' + d.map.replace(/\s/g, '_'))
		.attr('x', d => x(d.map))
		.attr('width', x.bandwidth())
		.attr('y', INNER_H)
		.attr('height', 0)
		.attr('rx', 2)
		.attr('fill', d => d.isAvg ? 'var(--average)' : 'url(#gT)')
    .attr('stroke', d => d.isAvg ? 'var(--border)' : 'none')
    .attr('stroke-width', 1)
		.on('mousemove', onEnter)
    .on('mouseleave', onLeave)
    .transition().duration(800).delay((d, i) => i * 55).ease(d3.easeCubicOut)
    .attr('y', d => y(100 - d.ctPct))
    .attr('height', d => INNER_H - y(100 - d.ctPct));

	g.selectAll('.divL')
		.data(fullData)
		.join('line')
		.attr('class', 'divL')
		.attr('x1', d => x(d.map))
		.attr('x2', d => x(d.map) + x.bandwidth())
		.attr('y1', INNER_H)
		.attr('y2', INNER_H)
		.attr('stroke', 'rgba(240,244,255,0.45)')
		.attr('stroke-width', 1.5)
		.style('pointer-events', 'none')
    .transition().duration(800).delay((d, i) => i * 55 + 150).ease(d3.easeCubicOut)
		.attr('y1', d => y(100 - d.ctPct))
		.attr('y2', d => y(100 - d.ctPct));

	// bar label
	g.selectAll('.lCT')
		.data(fullData)
		.join('text')
		.attr('class', 'bar-label lCT')
		.attr('x', d => x(d.map) + x.bandwidth() / 2)
		.attr('y', INNER_H)
		.attr('opacity', 0)
		.attr('fill', d => d.isAvg ? 'rgba(240,244,255,0.4)' : '#c8e4f5')
		.text(d => d.ctPct.toFixed(1) + '%')
		.transition().duration(600).delay((d, i) => i * 55 + 350).ease(d3.easeCubicOut)
		.attr('y', d => y(100 - d.ctPct / 2))
		.attr('opacity', d => d.ctPct > 18 ? 1 : 0);

	g.selectAll('.lT')
		.data(fullData)
		.join('text')
		.attr('class', 'bar-label lT')
		.attr('x', d => x(d.map) + x.bandwidth() / 2)
		.attr('y', INNER_H)
		.attr('opacity', 0)
		.attr('fill', d => d.isAvg ? 'rgba(240,244,255,0.4)' : '#f0c090')
    .text(d => d.tPct.toFixed(1) + '%')
    .transition().duration(600).delay((d, i) => i * 55 + 350).ease(d3.easeCubicOut)
		.attr('y', d => y(100 - d.ctPct - d.tPct / 2))
		.attr('opacity', d => d.tPct > 18 ? 1 : 0);

	g.selectAll('.nc1')
		.data(fullData)
		.join('text')
		.attr('class', 'map-count nc1')
		.attr('x', d => x(d.map) + x.bandwidth() / 2)
		.attr('y', INNER_H + ICON_PAD + ICON_SIZE + 28)
		.attr('opacity', 0).text(d => d.isAvg ? '' : ('n=' + d.maps))
    .transition().delay((d, i) => i * 55 + 350).duration(350)
		.attr('opacity', 1);

	addRedRef(g, y, 50, innerW, '50%');
	addIcons(g, fullData.filter(d => !d.isAvg), x, INNER_H + ICON_PAD);

}

/* =================== TAB 2 — PIE =================== */
function renderPie(cardId, pieData, valueKey, countKey, subLabel) {
	const card = document.getElementById(cardId);
	card.querySelector('.loading-state')?.remove();

	const sorted = [...pieData].sort((a, b) => b[valueKey] - a[valueKey]);
	const colorMap = {};
	sorted.forEach((d, i) => {
		colorMap[d.map] = PIE_COLORS[i % PIE_COLORS.length];
	});

	const size = 360,
		radius = size / 2 - 14,
		labelR = radius + 48,
		lineEndR = radius + 10;

	const wrap = document.createElement('div');
	wrap.className = 'pie-svg-wrap do-spin-in';
	card.appendChild(wrap);
	setTimeout(() => wrap.classList.remove('do-spin-in'), 900);

	const svg = d3.select(wrap).append('svg')
		.attr('viewBox', `0 0 ${size} ${size}`)
		.attr('width', '100%')
		.style('overflow', 'visible');
	const g = svg.append('g')
		.attr('transform', `translate(${size/2},${size/2})`);

	const pie = d3.pie().value(d => d[valueKey]).sort(null);
	const arc = d3.arc().innerRadius(radius * 0.38).outerRadius(radius);
	const arcHov = d3.arc().innerRadius(radius * 0.38).outerRadius(radius + 8);
	const arcs = pie(sorted);

	g.selectAll('.arc')
		.data(arcs)
		.join('g')
		.attr('class', 'pie-arc')
    .append('path')
		.attr('d', arc).attr('fill', d => colorMap[d.data.map])
    .attr('stroke', '#0b0f22')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)
		.on('mousemove', (ev, d) => {
			showTT(ev, `<strong>${d.data.map.toUpperCase()}</strong>
                  <div class="t-row">
                    <span>${subLabel}</span>
                    <span class="t-val">${d.data[valueKey].toFixed(1)}%</span>
                  </div>
                  <div class="t-row">
                    <span>${countKey==='ban1Count'?'Ban 1 picks':'Decider picks'}</span>
                    <span class="t-val">${d.data[countKey]}</span>
                  </div>
                  <div class="t-row">
                    <span>Pool appearances</span>
                    <span class="t-val">${d.data.appearances}</span>
                  </div>`);
			d3.select(ev.currentTarget)
				.attr('d', arcHov)
				.style('filter', 'brightness(1.2)');
		})
		.on('mouseleave', ev => {
			hideTT();
			d3.select(ev.currentTarget)
				.attr('d', arc)
				.style('filter', 'none');
		})
		.transition().duration(700).delay((_, i) => i * 50)
		.attr('opacity', 1);

	g.selectAll('.plbl')
		.data(arcs)
		.join('g')
		.attr('class', 'plbl').each(function (d) {
			const sel = d3.select(this);
			const mid = (d.startAngle + d.endAngle) / 2,
				pct = d.data[valueKey];
			if (pct < 1.2) return;
			const inner = {
				x: Math.sin(mid) * lineEndR,
				y: -Math.cos(mid) * lineEndR
			};
			const outer = {
				x: Math.sin(mid) * labelR,
				y: -Math.cos(mid) * labelR
			};
			const textX = outer.x + (outer.x > 0 ? 8 : -8),
				anchor = outer.x > 0 ? 'start' : 'end';
			sel.append('polyline')
				.attr('points', `${inner.x},${inner.y} ${outer.x},${outer.y} ${textX},${outer.y}`)
				.attr('fill', 'none')
				.attr('stroke', colorMap[d.data.map])
				.attr('stroke-width', 0.75)
				.attr('opacity', 0.6);
			// Pie chart map name
			sel.append('text')
				.attr('x', textX)
				.attr('y', outer.y - 3)
				.attr('text-anchor', anchor)
				.attr('font-family', 'Share Tech Mono')
				.attr('font-size', 9)
				.attr('font-weight', 700)
				.attr('fill', colorMap[d.data.map])
				.attr('letter-spacing', '0.5px').text(d.data.map.toUpperCase());
			// Pie chart %
			sel.append('text')
				.attr('x', textX)
				.attr('y', outer.y + 10)
				.attr('text-anchor', anchor)
				.attr('font-family', 'Rajdhani')
				.attr('font-size', 11)
				.attr('font-weight', 700)
				.attr('fill', 'var(--navy)').text(pct.toFixed(1) + '%');
		});

	const top = sorted[0];
	// Top map name
	g.append('text')
		.attr('text-anchor', 'middle')
		.attr('dy', '-0.4em')
		.attr('font-family', 'Rajdhani')
		.attr('font-size', 14)
		.attr('font-weight', 700)
		.attr('fill', colorMap[top.map])
		.attr('letter-spacing', '1px')
    .text(top.map.toUpperCase());
	// Top map %
	g.append('text')
		.attr('text-anchor', 'middle')
		.attr('dy', '1.1em')
		.attr('font-family', 'Share Tech Mono')
		.attr('font-size', 10)
		.attr('fill', 'var(--gold)')
    .text(top[valueKey].toFixed(1) + '%');
}

function renderTab2(pieData) {
	renderPie('pie-ban', pieData, 'ban1Rate', 'ban1Count', 'Ban 1 rate');
	renderPie('pie-pick', pieData, 'pick3Rate', 'pick3Count', 'Pick 3 rate');
	/* animate blocks */
	triggerFadeUp(document.getElementById('pie-ban-block'));
	setTimeout(() => triggerFadeUp(document.getElementById('pie-pick-block')), 120);
}

/* =================== TAB 3 — COMPARISON =================== */
function populateDropdowns(maps) {
	['sel-left', 'sel-right'].forEach(id => {
		const sel = document.getElementById(id);
		maps.forEach(mn => {
			const o = document.createElement('option');
			o.value = mn;
			o.textContent = mn;
			sel.appendChild(o);
		});
	});
}

function buildCmpCard(mapName) {
	const m0 = G.mapData.find(d => d.map === mapName);
	const m1 = G.sideData.find(d => d.map === mapName);
	const m2 = G.pieData.find(d => d.map === mapName);

	const card = document.createElement('div');
	card.className = 'compare-card';

	const hdr = document.createElement('div');
	hdr.className = 'cmp-map-header';
	const nm = document.createElement('div');
	nm.className = 'cmp-map-name';
	nm.textContent = mapName;
	hdr.appendChild(nm);
	const iconUrl = getIcon(mapName);
	if (iconUrl) {
		const img = document.createElement('img');
		img.className = 'cmp-map-icon';
		img.src = iconUrl;
		img.alt = mapName;
		hdr.appendChild(img);
	} else {
		const ph = document.createElement('div');
		ph.className = 'cmp-map-icon-ph';
		ph.textContent = '?';
		hdr.appendChild(ph);
	}
	card.appendChild(hdr);

	function addSec(label) {
		const s = document.createElement('div');
		s.className = 'cmp-section';
		s.textContent = label;
		card.appendChild(s);
	}

	function addRow(label, display, rawVal, betterHigh) {
		const row = document.createElement('div');
		row.className = 'cmp-row';
		const l = document.createElement('div');
		l.className = 'cmp-lbl';
		l.textContent = label;
		const v = document.createElement('div');
		v.className = 'cmp-val';
		v.textContent = display;
		v.dataset.raw = rawVal !== null ? rawVal : '';
		v.dataset.bh = betterHigh ? '1' : '0';
		row.appendChild(l);
		row.appendChild(v);
		card.appendChild(row);
	}

	addSec('WIN RATE ANALYSIS');

	if (m0) {
		addRow('Expected results', `${m0.expected} / ${m0.total}`, m0.pct, true);
		addRow('Upsets', `${m0.total - m0.expected} (${(100 - m0.pct).toFixed(1)}%)`, 100 - m0.pct, true);
		addRow('Expected rate', `${m0.pct.toFixed(1)}%`, m0.pct, true);
	} else {
		['Expected results', 'Upsets', 'Expected rate']
		.forEach(l => addRow(l, '—', '', true));
	}

	addSec('SIDE DISTRIBUTION');

	if (m1) {
		addRow('CT rounds', `${m1.ct} (${m1.ctPct.toFixed(1)}%)`, m1.ctPct, true);
		addRow('T rounds', `${m1.t} (${m1.tPct.toFixed(1)}%)`, m1.tPct, true);
		addRow('Total rounds', m1.total.toLocaleString(), m1.total, true);
		addRow('Maps played', m1.maps.toLocaleString(), m1.maps, true);
	} else {
		['CT rounds', 'T rounds', 'Total rounds', 'Maps played']
		.forEach(l => addRow(l, '—', '', true));
	}

	addSec('MAP POOL PREFERENCE');

	if (m2) {
		addRow('Ban 1 rate', `${m2.ban1Rate.toFixed(1)}%`, m2.ban1Rate, true);
		addRow('Ban 1 picks', m2.ban1Count.toLocaleString(), m2.ban1Count, true);
		addRow('Pool appearances', m2.appearances.toLocaleString(), m2.appearances, true);
		addRow('Pick 3 rate', `${m2.pick3Rate.toFixed(1)}%`, m2.pick3Rate, true);
		addRow('Decider picks', m2.pick3Count.toLocaleString(), m2.pick3Count, true);
	} else {
		['Ban 1 rate', 'Ban 1 picks', 'Pool appearances', 'Pick 3 rate', 'Decider picks']
		.forEach(l => addRow(l, '—', '', true));
	}

	return card;
}

function syncDropdowns() {
	const left = document.getElementById('sel-left');
	const right = document.getElementById('sel-right');

	const lVal = left.value;
	const rVal = right.value;

	[...left.options].forEach(o => {
		o.disabled = o.value !== '' && o.value === rVal;
	});

	[...right.options].forEach(o => {
		o.disabled = o.value !== '' && o.value === lVal;
	});
}

function updateComparison() {
	const lMap = document.getElementById('sel-left').value;
	const rMap = document.getElementById('sel-right').value;
	const lCont = document.getElementById('cmp-left'),
		rCont = document.getElementById('cmp-right');

	lCont.innerHTML = '';
	rCont.innerHTML = '';

	syncDropdowns();

	if (!lMap) {
		lCont.innerHTML = '<div class="compare-placeholder"><div class="compare-placeholder-icon">x</div>Select a map above</div>';
	} else lCont.appendChild(buildCmpCard(lMap));

	if (!rMap) {
		rCont.innerHTML = '<div class="compare-placeholder"><div class="compare-placeholder-icon">x</div>Select a map above</div>';
	} else rCont.appendChild(buildCmpCard(rMap));

	if (!lMap || !rMap) return;

	// green highlight for "better" values
	const lVals = [...lCont.querySelectorAll('.cmp-val')];
	const rVals = [...rCont.querySelectorAll('.cmp-val')];
	lVals.forEach((lv, i) => {
		const rv = rVals[i];
		if (!rv) return;
		const lr = parseFloat(lv.dataset.raw),
			rr = parseFloat(rv.dataset.raw);
		lv.classList.remove('better');
		rv.classList.remove('better');
		if (lv.dataset.raw === '' || rv.dataset.raw === '') return;
		if (isNaN(lr) || isNaN(rr) || lr === rr) return;
		const betterHigh = lv.dataset.bh === '1';
		const lWins = betterHigh ? (lr > rr) : (lr < rr);
		if (lWins) lv.classList.add('better');
		else rv.classList.add('better');
	});
}

/* =================== TAB 4 — MATCH TIMELINE =================== */
function renderTab4(timeData) {
	const cont = document.getElementById('cc4');
	cont.innerHTML = '';

	if (!timeData || timeData.length < 2) {
		cont.innerHTML = '<div class="error-state">No date data available in the CSV (expected a "date" column).</div>';
		return;
	}

	document.getElementById('pills-4').style.display = 'flex';
	document.getElementById('leg4').style.display = 'flex';

	const total = timeData.reduce((s, d) => s + d.count, 0);
	const peak = timeData.reduce((a, b) => b.count > a.count ? b : a);
	const years = new Set(timeData.map(d => d.year));
	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	document.getElementById('p4-total').textContent = total.toLocaleString() + ' matches';


	const LM = {
		top: 24,
		right: 48,
		bottom: 52,
		left: 56
	};
	const LINE_H = INNER_H;
	const totalW = Math.max(cont.offsetWidth || 900, 700);
	const innerW = totalW - LM.left - LM.right;

	const svg = d3.select('#cc4').append('svg')
		.attr('width', totalW)
		.attr('height', CHART_H);

	const g = svg.append('g')
		.attr('transform', `translate(${LM.left},${LM.top})`);

	const parseKey = d3.timeParse('%Y-%m');
	const tData = timeData.map(d => ({
		...d,
		date: parseKey(d.key)
	})).slice(1, -1);;

	const xScale = d3.scaleTime()
		.domain(d3.extent(tData, d => d.date))
		.range([0, innerW]);

	const yScale = d3.scaleLinear()
		.domain([0, d3.max(tData, d => d.count) * 1.1])
		.range([LINE_H, 0]);

	yScale.ticks(6).forEach(v => {
		g.append('line')
			.attr('class', 'gridline')
			.attr('x1', 0).attr('x2', innerW)
			.attr('y1', yScale(v)).attr('y2', yScale(v));
	});

	// Area fill beneath line
	const areaDef = d3.area()
		.x(d => xScale(d.date))
		.y0(LINE_H)
		.y1(d => yScale(d.count))
		.curve(d3.curveMonotoneX);

	const defs = svg.append('defs');
	const areaGrad = defs.append('linearGradient')
		.attr('id', 'gLine')
		.attr('x1', '0')
		.attr('y1', '0')
		.attr('x2', '0')
		.attr('y2', '1');

	areaGrad
		.append('stop')
		.attr('offset', '0%')
		.attr('stop-color', '#FCAC19')
		.attr('stop-opacity', 0.22);

	areaGrad
		.append('stop')
		.attr('offset', '100%')
		.attr('stop-color', '#FCAC19')
		.attr('stop-opacity', 0.01);

	g.append('path')
		.datum(tData)
		.attr('fill', 'url(#gLine)')
		.attr('d', areaDef);

	// Per-year average reference lines
	years.forEach(yr => {
		const yrData = tData.filter(d => d.year === yr);
		if (yrData.length < 2) return;
		const avg = yrData.reduce((s, d) => s + d.count, 0) / yrData.length;
		const x0 = xScale(yrData[0].date);
		const x1 = xScale(yrData[yrData.length - 1].date);
		g.append('line')
			.attr('x1', x0)
			.attr('x2', x1)
			.attr('y1', yScale(avg))
			.attr('y2', yScale(avg))
			.attr('stroke', '#e05555')
			.attr('stroke-width', 1.5)
			.attr('stroke-dasharray', '6,4')
			.attr('opacity', 0.85);
	});

	const lineDef = d3.line()
		.x(d => xScale(d.date))
		.y(d => yScale(d.count))
		.curve(d3.curveMonotoneX);

	const linePath = g.append('path')
		.datum(tData)
		.attr('fill', 'none')
		.attr('stroke', 'var(--gold)')
		.attr('stroke-width', 2)
		.attr('d', lineDef);

	const totalLen = linePath.node().getTotalLength();
	linePath
		.attr('stroke-dasharray', totalLen)
		.attr('stroke-dashoffset', totalLen)
		.transition().duration(1400).ease(d3.easeCubicOut)
		.attr('stroke-dashoffset', 0);

	// Dots appear after line
	g.selectAll('.tdot')
		.data(tData)
		.join('circle')
		.attr('class', 'tdot')
		.attr('cx', d => xScale(d.date))
		.attr('cy', d => yScale(d.count))
		.attr('r', 0)
		.attr('fill', 'var(--gold)')
		.attr('stroke', 'var(--bg-panel)')
		.attr('stroke-width', 1.5)
		.style('cursor', 'default')
		.on('mousemove', (ev, d) => {
			showTT(ev, `<strong>${MONTH_NAMES[d.month-1].toUpperCase()+' '+d.year}</strong>` +
				`<div class="t-row"><span >Matches</span><span class="t-val" >${d.count}</span></div>`);
		})
		.on('mouseleave', () => hideTT())
		.transition().delay(1350).duration(300)
		.attr('r', 3);

	g.append('g')
		.attr('class', 'axis')
		.attr('transform', `translate(0,${LINE_H})`)
		.call(
			d3.axisBottom(xScale)
			.ticks(d3.timeYear.every(1))
			.tickFormat(d3.timeFormat('%Y'))
			.tickSize(0)
		)
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dy', '1.4em')
				.style('letter-spacing', '1px')
				.style('font-family', 'var(--font-m)')
				.style('font-size', '11px');
		});

	g.append('g')
		.attr('class', 'axis axis-months')
		.attr('transform', `translate(0,${LINE_H})`)
		.call(
			d3.axisBottom(xScale)
			.ticks(d3.timeMonth.every(1))
			.tickFormat(d => {
				const m = d.getMonth();

				return d3.timeFormat('%b')(d);
			})
			.tickSize(0)
		)
		.call(ax => {
			ax.select('.domain').remove();

			ax.selectAll('text')
				.attr('dy', '2.8em')
				.style('font-size', '9px')
				.style('opacity', 0.55)
				.style('letter-spacing', '0.5px');
		});

	g.append('g')
		.attr('class', 'axis')
		.call(
			d3.axisLeft(yScale)
			.ticks(6)
			.tickFormat(d => d)
			.tickSize(0)
		)
		.call(ax => {
			ax.select('.domain').remove();
			ax.selectAll('text')
				.attr('dx', '-6px');
		});
}

window.addEventListener('DOMContentLoaded', () => {
	fetch('cs_hltv_data.csv')
		.then(r => {
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			return r.text();
		})
		.then(csv => {
			const parsed = parseAll(csv);
			G.mapData = parsed.mapData;
			G.sideData = parsed.sideData;
			G.pieData = parsed.pieData;
			G.timeData = parsed.timeData;

			didAnimate[0] = true;
			renderTab0(G.mapData);

			/* populate comparison dropdowns */
			const mapSet = new Set([...G.mapData.map(d => d.map), ...G.sideData.map(d => d.map), ...G.pieData.map(d => d.map)]);
			populateDropdowns([...mapSet].sort());
		})
		.catch(err => {
			['cc0', 'cc1'].forEach(id => {
				const el = document.getElementById(id);
				if (el) el.innerHTML = `<div class="error-state">Failed to load cs_hltv_data.csv — ${err.message}<br><br>Serve via HTTP alongside the CSV.</div>`;
			});
			['pie-ban', 'pie-pick'].forEach(id => {
				const el = document.getElementById(id);
				if (el) el.querySelector('.loading-state').outerHTML = `<div class="error-state" style="width:100%">Load error: ${err.message}</div>`;
			});
		});
});