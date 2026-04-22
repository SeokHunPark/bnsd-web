import { parse } from 'node-html-parser';

export async function onRequestGet({ request }) {
  const urlParams = new URL(request.url).searchParams;
  const date = urlParams.get('date');
  const id = urlParams.get('id');

  if (!date || !/^\d{8}$/.test(date)) {
    return new Response(JSON.stringify({ error: '날짜 형식이 올바르지 않습니다. (YYYYMMDD)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = id 
      ? `https://missa.cbck.or.kr/DailyMissa/${date}/${id}`
      : `https://missa.cbck.or.kr/DailyMissa/${date}`;
      
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`매일미사 서버 응답 오류: ${response.status}`);
    }

    const html = await response.text();
    const parsed = parseMissaHtml(html, date);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 'Cache-Control': 'public, max-age=3600' // 클라우드플레어 자체 캐싱 활용
      }
    });
  } catch (error) {
    console.error('크롤링 오류:', error.message);
    return new Response(JSON.stringify({ error: '매일미사 데이터를 가져오는 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// 매일미사 HTML 파싱
// ============================================================
function parseMissaHtml(html, dateStr) {
  const root = parse(html);

  const result = {
    date: formatDateString(dateStr),
    liturgyName: '',
    liturgyColor: '',
    readings: [],
    gospel: {
      keyVerse: '',
      reference: '',
      text: '',
    },
    meditation: '',
    masses: [],
  };

  // 다중 미사 링크 추출
  const links = root.querySelectorAll('a').filter(a => {
    const href = a.getAttribute('href');
    return href && href.match(new RegExp(`/DailyMissa/${dateStr}/([0-9]+)$`));
  });
  
  if (links.length > 0) {
    const masses = [];
    links.forEach(a => {
      const match = a.getAttribute('href').match(/([0-9]+)$/);
      if (match) {
        masses.push({
          id: match[1],
          name: a.text.trim().replace(/^\[.+?\]\s*/, '')
        });
      }
    });
    const uniqueIds = new Set();
    result.masses = masses.filter(m => {
      if (uniqueIds.has(m.id)) return false;
      uniqueIds.add(m.id);
      return true;
    });
  }

  // 전례명 추출
  const h3Tags = root.querySelectorAll('h3');
  for (const h3 of h3Tags) {
    const text = h3.text.trim();
    const colorMatch = text.match(/\[([가-힣]+)\]\s*(.+)/);
    if (colorMatch) {
      result.liturgyColor = colorMatch[1];
      result.liturgyName = colorMatch[2].trim();
      break;
    }
  }

  // 섹션 파싱
  const sections = root.querySelectorAll('div.bottompadding-sm');

  for (const section of sections) {
    const h4 = section.querySelector('h4');
    if (!h4) continue;

    const sectionTitle = h4.text.trim();

    // 복음 섹션
    if (sectionTitle === '복음' && !result.gospel.text) {
      const titleBlock = section.querySelector('.title-block');
      if (titleBlock) {
        const spans = titleBlock.querySelectorAll('span');
        for (const sp of spans) {
          const spText = sp.text.trim();
          const kvMatch = spText.match(/<(.+)>/);
          if (kvMatch) {
            result.gospel.keyVerse = kvMatch[1].trim();
            break;
          }
        }
      }

      const h5 = section.querySelector('h5.float-right');
      if (h5 && h5.text.trim()) {
        result.gospel.reference = h5.text.trim();
      }

      const headerDivs = section.querySelectorAll('div');
      for (const div of headerDivs) {
        const divText = div.text.trim();
        const bookMatch = divText.match(/✠\s*(.+?)(?:이|가)\s*전한/);
        if (bookMatch && result.gospel.reference) {
          result.gospel.reference = `${bookMatch[1]} ${result.gospel.reference}`;
          break;
        }
      }

      const bodyText = extractSectionBody(section);
      if (bodyText) {
        result.gospel.text = bodyText;
      }
    }

    // 오늘의 묵상 섹션
    if (sectionTitle === '오늘의 묵상' && !result.meditation) {
      const text = extractSectionBody(section);
      if (text) result.meditation = text;
    }

    if (sectionTitle === '오늘 전례' && !result.liturgyName) {
      const text = extractSectionBody(section);
      if (text) result.liturgyName = text.split('\n')[0];
    }
  }

  return result;
}

function extractSectionBody(section) {
  const texts = [];
  const tjustifyRows = section.querySelectorAll('div.tjustify');
  for (const row of tjustifyRows) {
    const leafDivs = row.querySelectorAll('div');
    for (const div of leafDivs) {
      if (div.querySelectorAll('div').length === 0) {
        const text = div.text.trim();
        if (text) texts.push(text);
      }
    }
  }

  if (texts.length === 0) {
    const allRows = section.querySelectorAll('div.row');
    for (const row of allRows) {
      if (row.querySelector('h4') || row.querySelector('h5')) continue;
      if (row.innerHTML.includes('title-block')) continue;

      const leafDivs = row.querySelectorAll('div');
      for (const div of leafDivs) {
        if (div.querySelectorAll('div').length === 0) {
          const text = div.text.trim();
          if (text) texts.push(text);
        }
      }

      if (leafDivs.length <= 1) {
        const rowText = row.text.trim();
        if (rowText && !texts.includes(rowText)) {
          texts.push(rowText);
        }
      }
    }
  }

  const filtered = texts.filter(t =>
    !t.startsWith('◎') &&
    t !== '주님의 말씀입니다.'
  );

  return filtered.join('\n');
}

function formatDateString(str) {
  if (str.length !== 8) return str;
  const y = str.substring(0, 4);
  const m = str.substring(4, 6);
  const d = str.substring(6, 8);
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 ${weekdays[date.getDay()]}요일`;
}
