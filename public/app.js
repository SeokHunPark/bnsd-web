/**
 * 말씀 나눔 (BNSD) — 클라이언트 애플리케이션
 * SPA 라우팅, 크롤링 API 호출, 나눔 데이터 관리
 */
(() => {
  'use strict';

  // ============================================================
  // 상태 관리
  // ============================================================
  const state = {
    currentPage: 'home',
    adminPin: null,       // 인증된 PIN (세션 동안 유지)
    missaData: null,      // 크롤링 결과
    sharingData: null,    // 현재 나눔 데이터
  };

  // ============================================================
  // DOM 요소 참조
  // ============================================================
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const elements = {
    // 페이지 섹션
    pageHome: $('#page-home'),
    pageSharing: $('#page-sharing'),
    pageAdmin: $('#page-admin'),

    // 메인 버튼
    btnJoin: $('#btn-join'),
    btnAdmin: $('#btn-admin'),

    // 나눔 참여 페이지
    sharingLoading: $('#sharing-loading'),
    sharingEmpty: $('#sharing-empty'),
    sharingContent: $('#sharing-content'),
    sharingDate: $('#sharing-date'),
    sharingLiturgy: $('#sharing-liturgy'),
    sharingReference: $('#sharing-reference'),
    sharingKeyVerseBox: $('#sharing-key-verse-box'),
    sharingKeyVerse: $('#sharing-key-verse'),
    sharingGospelText: $('#sharing-gospel-text'),
    sharingReflectionCard: $('#sharing-reflection-card'),
    sharingReflectionText: $('#sharing-reflection-text'),
    sharingContemplationCard: $('#sharing-contemplation-card'),
    sharingContemplationText: $('#sharing-contemplation-text'),

    // 관리자 페이지
    adminForm: $('#admin-form'),
    adminDate: $('#admin-date'),
    btnFetchMissa: $('#btn-fetch-missa'),
    adminLiturgy: $('#admin-liturgy'),
    adminReference: $('#admin-reference'),
    adminGospel: $('#admin-gospel'),
    adminKeyVerse: $('#admin-key-verse'),
    adminReflection: $('#admin-reflection'),
    adminContemplation: $('#admin-contemplation'),
    btnSubmit: $('#btn-submit'),

    // 자동 채움 그룹
    groupLiturgy: $('#group-liturgy'),
    groupReference: $('#group-reference'),
    groupGospel: $('#group-gospel'),
    
    // 다중 미사 선택
    groupMassSelect: $('#group-mass-select'),
    adminMassSelect: $('#admin-mass-select'),

    // PIN 모달
    pinModal: $('#pin-modal'),
    pinInput: $('#pin-input'),
    pinError: $('#pin-error'),
    btnPinCancel: $('#btn-pin-cancel'),
    btnPinSubmit: $('#btn-pin-submit'),

    // 확인 모달
    confirmModal: $('#confirm-modal'),
    confirmTitle: $('#confirm-title'),
    confirmDesc: $('#confirm-desc'),
    btnConfirmOk: $('#btn-confirm-ok'),

    // 토스트
    toast: $('#toast'),
  };

  // ============================================================
  // 유틸리티
  // ============================================================

  /** 토스트 메시지 표시 */
  function showToast(message, duration = 2500) {
    elements.toast.textContent = message;
    elements.toast.classList.add('active');
    setTimeout(() => elements.toast.classList.remove('active'), duration);
  }

  /** 확인 모달 표시 */
  function showConfirm(title, desc) {
    return new Promise((resolve) => {
      elements.confirmTitle.textContent = title;
      elements.confirmDesc.textContent = desc;
      elements.confirmModal.classList.add('active');

      const handler = () => {
        elements.confirmModal.classList.remove('active');
        elements.btnConfirmOk.removeEventListener('click', handler);
        resolve();
      };
      elements.btnConfirmOk.addEventListener('click', handler);
    });
  }

  /** 날짜를 YYYYMMDD 형식으로 변환 */
  function dateToString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  /** 오늘 날짜를 input[type=date] 형식으로 */
  function getTodayInputValue() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ============================================================
  // 라우팅
  // ============================================================

  /** 페이지 전환 */
  function navigateTo(page) {
    window.location.hash = page;
  }

  /** hash 변경 처리 */
  function handleRouteChange() {
    const hash = window.location.hash.replace('#', '') || 'home';

    // 모든 페이지 숨기기
    $$('.page-section').forEach(section => section.classList.remove('active'));

    switch (hash) {
      case 'sharing':
        elements.pageSharing.classList.add('active');
        loadSharingData();
        break;
      case 'admin':
        // 인증 확인
        if (!state.adminPin) {
          showPinModal();
          return;
        }
        elements.pageAdmin.classList.add('active');
        initAdminPage();
        break;
      default:
        elements.pageHome.classList.add('active');
    }

    state.currentPage = hash;
    window.scrollTo(0, 0);
  }

  // ============================================================
  // PIN 인증
  // ============================================================

  function showPinModal() {
    elements.pinModal.classList.add('active');
    elements.pinInput.value = '';
    elements.pinError.textContent = '';
    elements.pinInput.classList.remove('modal__input--error');
    setTimeout(() => elements.pinInput.focus(), 100);
  }

  function hidePinModal() {
    elements.pinModal.classList.remove('active');
  }

  async function verifyPin() {
    const pin = elements.pinInput.value.trim();
    if (!pin) {
      elements.pinError.textContent = '비밀번호를 입력해주세요.';
      elements.pinInput.classList.add('modal__input--error');
      return;
    }

    try {
      const response = await fetch('/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (result.success) {
        state.adminPin = pin;
        hidePinModal();
        elements.pageAdmin.classList.add('active');
        initAdminPage();
      } else {
        elements.pinError.textContent = '비밀번호가 올바르지 않습니다.';
        elements.pinInput.classList.add('modal__input--error');
        elements.pinInput.value = '';
        elements.pinInput.focus();
      }
    } catch (error) {
      elements.pinError.textContent = '서버 연결에 실패했습니다.';
    }
  }

  // ============================================================
  // 나눔 참여 페이지
  // ============================================================

  async function loadSharingData() {
    // 로딩 상태
    elements.sharingLoading.style.display = 'flex';
    elements.sharingEmpty.style.display = 'none';
    elements.sharingContent.style.display = 'none';

    try {
      const response = await fetch('/api/sharing');
      const data = await response.json();

      if (data.empty) {
        elements.sharingLoading.style.display = 'none';
        elements.sharingEmpty.style.display = 'block';
        return;
      }

      state.sharingData = data;
      renderSharing(data);

      elements.sharingLoading.style.display = 'none';
      elements.sharingContent.style.display = 'block';
    } catch (error) {
      elements.sharingLoading.style.display = 'none';
      elements.sharingEmpty.style.display = 'block';
      showToast('데이터를 불러올 수 없습니다.');
    }
  }

  /** 나눔 데이터 렌더링 */
  function renderSharing(data) {
    elements.sharingDate.textContent = data.date || '';
    elements.sharingLiturgy.textContent = data.liturgyName || '';
    elements.sharingReference.textContent = data.gospelReference || '';

    // 핵심 구절
    if (data.keyVerse) {
      elements.sharingKeyVerse.textContent = data.keyVerse;
      elements.sharingKeyVerseBox.style.display = 'block';
    } else {
      elements.sharingKeyVerseBox.style.display = 'none';
    }

    // 복음 본문
    elements.sharingGospelText.textContent = data.gospelText || '';

    // 성찰하기
    if (data.reflectionText) {
      elements.sharingReflectionText.textContent = data.reflectionText;
      elements.sharingReflectionCard.style.display = 'block';
    } else {
      elements.sharingReflectionCard.style.display = 'none';
    }

    // 새겨보기
    if (data.contemplationText) {
      elements.sharingContemplationText.textContent = data.contemplationText;
      elements.sharingContemplationCard.style.display = 'block';
    } else {
      elements.sharingContemplationCard.style.display = 'none';
    }
  }

  // ============================================================
  // 나눔 설정 페이지 (관리자)
  // ============================================================

  /** 관리자 페이지 초기화 */
  function initAdminPage() {
    // 오늘 날짜를 기본값으로 설정
    if (!elements.adminDate.value) {
      elements.adminDate.value = getTodayInputValue();
    }
  }

  /** 매일미사 데이터 가져오기 */
  async function fetchMissaData(targetId = null) {
    const dateValue = elements.adminDate.value;
    if (!dateValue) {
      showToast('날짜를 선택해주세요.');
      return;
    }

    const dateStr = dateValue.replace(/-/g, '');
    let url = `/api/missa?date=${dateStr}`;
    if (targetId) {
      url += `&id=${targetId}`;
    }

    // 버튼 로딩 상태
    elements.btnFetchMissa.classList.add('btn--loading');
    elements.btnFetchMissa.disabled = true;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        showToast(data.error);
        return;
      }

      state.missaData = data;
      fillAdminForm(data);
      
      // 다중 미사 목록 처리 (최초 조회 시)
      if (!targetId) {
        if (data.masses && data.masses.length > 0) {
          elements.groupMassSelect.style.display = 'block';
          elements.adminMassSelect.innerHTML = data.masses.map(m => 
            `<option value="${m.id}">${m.name}</option>`
          ).join('');
        } else {
          elements.groupMassSelect.style.display = 'none';
          elements.adminMassSelect.innerHTML = '';
        }
      }
      
      showToast('매일미사 데이터를 가져왔습니다.');
    } catch (error) {
      showToast('매일미사 데이터를 가져올 수 없습니다.');
    } finally {
      elements.btnFetchMissa.classList.remove('btn--loading');
      elements.btnFetchMissa.disabled = false;
    }
  }

  /** 크롤링 데이터로 폼 자동 채움 */
  function fillAdminForm(data) {
    // 전례명
    if (data.liturgyName) {
      elements.adminLiturgy.value = data.liturgyName;
      elements.groupLiturgy.classList.add('form-group--auto-filled');
    }

    // 복음 장절
    if (data.gospel?.reference) {
      elements.adminReference.value = data.gospel.reference;
      elements.groupReference.classList.add('form-group--auto-filled');
    }

    // 복음 본문
    if (data.gospel?.text) {
      elements.adminGospel.value = data.gospel.text;
      elements.groupGospel.classList.add('form-group--auto-filled');
    }

    // 복음 핵심 구절 (자동 채움)
    if (data.gospel?.keyVerse) {
      elements.adminKeyVerse.value = data.gospel.keyVerse;
      const groupKeyVerse = elements.adminKeyVerse.closest('.form-group');
      if (groupKeyVerse) groupKeyVerse.classList.add('form-group--auto-filled');
    }
  }

  /** 나눔 데이터 저장 */
  async function saveSharing(event) {
    event.preventDefault();

    // 필수 필드 검증
    const keyVerse = elements.adminKeyVerse.value.trim();
    const reflection = elements.adminReflection.value.trim();
    const contemplation = elements.adminContemplation.value.trim();

    if (!keyVerse || !reflection || !contemplation) {
      showToast('필수 항목을 모두 입력해주세요.');
      return;
    }

    const dateValue = elements.adminDate.value;
    const dateStr = dateValue ? dateValue.replace(/-/g, '') : '';

    const sharingData = {
      date: state.missaData?.date || formatDateForDisplay(dateValue),
      liturgyName: elements.adminLiturgy.value.trim(),
      gospelReference: elements.adminReference.value.trim(),
      gospelText: elements.adminGospel.value.trim(),
      keyVerse: keyVerse,
      reflectionText: reflection,
      contemplationText: contemplation,
      pin: state.adminPin,
    };

    // 버튼 로딩 상태
    elements.btnSubmit.classList.add('btn--loading');
    elements.btnSubmit.disabled = true;

    try {
      const response = await fetch('/api/sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sharingData),
      });

      const result = await response.json();

      if (result.success) {
        await showConfirm('설정 완료 ✝', '나눔이 저장되었습니다. 참여자들이 열람할 수 있습니다.');
        navigateTo('sharing');
      } else {
        showToast(result.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      showToast('서버 연결에 실패했습니다.');
    } finally {
      elements.btnSubmit.classList.remove('btn--loading');
      elements.btnSubmit.disabled = false;
    }
  }

  /** date input 값을 표시용 문자열로 변환 */
  function formatDateForDisplay(dateValue) {
    if (!dateValue) return '';
    const [y, m, d] = dateValue.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일 ${weekdays[date.getDay()]}요일`;
  }

  // ============================================================
  // 이벤트 바인딩
  // ============================================================

  function bindEvents() {
    // 메인 페이지 버튼
    elements.btnJoin.addEventListener('click', () => navigateTo('sharing'));
    elements.btnAdmin.addEventListener('click', () => navigateTo('admin'));

    // 뒤로가기 버튼 (이벤트 위임)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-navigate]');
      if (btn) {
        navigateTo(btn.dataset.navigate);
      }
    });

    // 매일미사 가져오기
    elements.btnFetchMissa.addEventListener('click', () => fetchMissaData());
    
    // 다중 미사 선택 시 재조회
    elements.adminMassSelect.addEventListener('change', (e) => {
      fetchMissaData(e.target.value);
    });

    // 관리자 폼 제출
    elements.adminForm.addEventListener('submit', saveSharing);

    // PIN 모달
    elements.btnPinSubmit.addEventListener('click', verifyPin);
    elements.btnPinCancel.addEventListener('click', () => {
      hidePinModal();
      navigateTo('home');
    });
    elements.pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') verifyPin();
    });

    // hash 라우팅
    window.addEventListener('hashchange', handleRouteChange);

    // 자동 채움 필드 수정 시 배지 제거
    [elements.adminLiturgy, elements.adminReference, elements.adminGospel, elements.adminKeyVerse].forEach(el => {
      el.addEventListener('input', () => {
        el.closest('.form-group')?.classList.remove('form-group--auto-filled');
      });
    });
  }

  // ============================================================
  // 초기화
  // ============================================================

  function init() {
    bindEvents();
    handleRouteChange();
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
