export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const pin = body.pin;

    // 환경변수 기반 PIN (환경변수에 없으면 1234)
    const ADMIN_PIN = env.ADMIN_PIN || '1234';

    if (pin === ADMIN_PIN) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: '잘못된 비밀번호입니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
