export async function onRequestGet({ env }) {
  try {
    // KV에서 데이터 읽기
    const data = await env.BNSD_KV.get('bnsd_sharing_data', 'json');

    if (!data) {
      return new Response(JSON.stringify({ empty: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '데이터를 읽어오는 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pin = request.headers.get('x-admin-pin') || body.pin;
    
    // 환경변수 기반 PIN 검증
    const ADMIN_PIN = env.ADMIN_PIN || '1234';

    if (!pin || pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ error: '관리자 인증에 실패했습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 나눔 데이터 준비
    const sharingData = {
      date: body.date,
      liturgyName: body.liturgyName,
      gospelReference: body.gospelReference,
      gospelText: body.gospelText,
      keyVerse: body.keyVerse,
      reflectionText: body.reflectionText,
      contemplationText: body.contemplationText,
      updatedAt: new Date().toISOString()
    };

    // KV에 데이터 쓰기
    await env.BNSD_KV.put('bnsd_sharing_data', JSON.stringify(sharingData));

    return new Response(JSON.stringify({ success: true, data: sharingData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '데이터를 저장하는 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
