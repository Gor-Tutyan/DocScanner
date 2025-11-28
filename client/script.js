// Форматирование телефона (+374 XX XXXXXX)
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', function (e) {
  let v = e.target.value.replace(/\D/g, '');
  if (!v.startsWith('374')) v = '374' + v.replace(/^374/, '');
  v = v.substring(0, 11);

  let formatted = '+374 ';
  if (v.length > 3) formatted += v.substring(3, 5) + ' ';
  if (v.length > 5) formatted += v.substring(5);
  e.target.value = formatted;
});

// Курсор всегда в конец при фокусе/клике
phoneInput.addEventListener('focus', () => setTimeout(() => phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length), 0));
phoneInput.addEventListener('click', () => setTimeout(() => phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length), 0));

// Форматирование карты (1234 5678 9012 3456)
document.getElementById('card').addEventListener('input', function (e) {
  let v = e.target.value.replace(/\D/g, '').substring(0, 16);
  v = v.match(/.{1,4}/g)?.join(' ') || v;
  e.target.value = v;
  validateForm();
});

// Проверка по алгоритму Луна
function luhnCheck(num) {
  const digits = num.replace(/\s/g, '').split('').map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Валидация формы
function validateForm() {
  const card = document.getElementById('card').value;
  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const phone = document.getElementById('phone').value;
  const docOk = document.getElementById('docImg').style.display === 'block';
  const selfieOk = document.getElementById('selfieImg').style.display === 'block';

  const cardValid = card.length === 19 && luhnCheck(card);
  const phoneValid = /^\+374 \d{2} \d{6}$/.test(phone);

  // Ошибка карты
  document.getElementById('cardError').textContent =
    card.length === 19 && !cardValid ? 'Սխալ քարտի համար' : '';
  document.getElementById('card').classList.toggle('invalid', card.length === 19 && !cardValid);

  // Статусы фото
  document.getElementById('docStatus').textContent = docOk ? 'Ընտրված է' : 'Պարտադիր է';
  document.getElementById('docStatus').className = docOk ? 'status ok' : 'status error';
  document.getElementById('selfieStatus').textContent = selfieOk ? 'Արված է' : 'Պարտադիր է';
  document.getElementById('selfieStatus').className = selfieOk ? 'status ok' : 'status error';

  // Активация кнопки
  const allOk = cardValid && name && surname && phoneValid && docOk && selfieOk;
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = !allOk;
  submitBtn.classList.toggle('active', allOk);
}

// Подписываемся на изменения полей
['card', 'name', 'surname', 'phone'].forEach(id => {
  document.getElementById(id).addEventListener('input', validateForm);
});

// === Загрузка документа ===
document.getElementById('chooseDoc').onclick = () => document.getElementById('docFile').click();
document.getElementById('docFile').onchange = e => {
  if (e.target.files[0]) {
    document.getElementById('docImg').src = URL.createObjectURL(e.target.files[0]);
    document.getElementById('docImg').style.display = 'block';
    validateForm();
  }
};

// === Селфи ===
document.getElementById('takeSelfie').onclick = () => document.getElementById('selfieCam').click();
document.getElementById('selfieCam').onchange = e => {
  if (e.target.files[0]) {
    document.getElementById('selfieImg').src = URL.createObjectURL(e.target.files[0]);
    document.getElementById('selfieImg').style.display = 'block';
    validateForm();
  }
};

// === ОТПРАВКА НА СЕРВЕР ===
document.getElementById('submitBtn').onclick = async () => {
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn.disabled) return;

  // Блокируем кнопку и показываем загрузку
  submitBtn.disabled = true;
  submitBtn.textContent = 'Ուղարկվում է...';
  submitBtn.classList.remove('active');

  const formData = new FormData();
  formData.append('card', document.getElementById('card').value);
  formData.append('name', document.getElementById('name').value.trim());
  formData.append('surname', document.getElementById('surname').value.trim());
  formData.append('phone', document.getElementById('phone').value);
  formData.append('docFile', document.getElementById('docFile').files[0]);
  formData.append('selfieFile', document.getElementById('selfieCam').files[0]);

  try {
    const response = await fetch('/submit', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      alert('Հաջողությամբ ուղարկվեց!');
      // Сброс формы
      document.querySelectorAll('input[type=text]').forEach(i => i.value = '');
      phoneInput.value = '+374 ';
      document.getElementById('docImg').style.display = 'none';
      document.getElementById('selfieImg').style.display = 'none';
      document.getElementById('docFile').value = '';
      document.getElementById('selfieCam').value = '';
      validateForm();
    } else {
      alert(result.message || 'Սխալ ուղարկելիս');
    }
  } catch (err) {
    console.error(err);
    alert('Серверի սխալ, փորձեք մի փոքր ուշ');
  } finally {
    // Возвращаем кнопку в исходное состояние
    validateForm();
    submitBtn.textContent = 'Ուղարկել';
  }
};