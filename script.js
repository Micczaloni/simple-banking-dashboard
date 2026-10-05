'use strict';

/////////////////////////////////////////////////
// DATA

const daysAgo = days =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const account1 = {
  owner: 'Anna Kowalska',
  movements: [2500, -420.5, 980, -65.9, 3200, -180, 75.4, 1100],
  interestRate: 1.2,
  pin: 1111,
  movementsDates: [
    daysAgo(45),
    daysAgo(32),
    daysAgo(21),
    daysAgo(14),
    daysAgo(7),
    daysAgo(3),
    daysAgo(1),
    daysAgo(0),
  ],
  currency: 'PLN',
  locale: 'pl-PL',
};

const account2 = {
  owner: 'Marcus Reed',
  movements: [4200, 1500, -230, -890, -1200, 640, -55, 2100],
  interestRate: 1.5,
  pin: 2222,
  movementsDates: [
    daysAgo(40),
    daysAgo(28),
    daysAgo(19),
    daysAgo(12),
    daysAgo(8),
    daysAgo(4),
    daysAgo(2),
    daysAgo(0),
  ],
  currency: 'EUR',
  locale: 'de-DE',
};

const account3 = {
  owner: 'Sofia Chen',
  movements: [8000, -320, 450, -1200, -90, 2600, -40, 950],
  interestRate: 1.1,
  pin: 3333,
  movementsDates: [
    daysAgo(38),
    daysAgo(25),
    daysAgo(17),
    daysAgo(11),
    daysAgo(6),
    daysAgo(3),
    daysAgo(1),
    daysAgo(0),
  ],
  currency: 'USD',
  locale: 'en-US',
};

const accounts = [account1, account2, account3];

/////////////////////////////////////////////////
// ELEMENTS

const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');
const labelAvatar = document.querySelector('.avatar');

const containerApp = document.querySelector('.app');
const containerLogin = document.querySelector('.login-screen');
const containerMovements = document.querySelector('.movements__list');
const containerSession = document.querySelector('.session');
const toastEl = document.querySelector('.toast');

const formLogin = document.querySelector('.login');
const formTransfer = document.querySelector('.form--transfer');
const formLoan = document.querySelector('.form--loan');
const formClose = document.querySelector('.form--close');
const btnSort = document.querySelector('.btn--sort');
const btnLogout = document.querySelector('.btn--logout');
const filterButtons = document.querySelectorAll('.filter__btn');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

/////////////////////////////////////////////////
// STATE

let currentAccount;
let timer;
let sorted = false;
let activeFilter = 'all';
let toastTimeout;

/////////////////////////////////////////////////
// HELPERS

const createUsernames = function (accs) {
  accs.forEach(function (acc) {
    acc.username = acc.owner
      .toLowerCase()
      .split(' ')
      .map(name => name[0])
      .join('');
  });
};
createUsernames(accounts);

const getInitials = owner =>
  owner
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();

const showToast = function (message, type = 'success') {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.className = `toast toast--visible toast--${type}`;

  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('toast--visible');
  }, 2800);
};

const formatMovementDate = function (date, locale) {
  const calcDaysPassed = (date1, date2) =>
    Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));

  const daysPassed = calcDaysPassed(new Date(), date);

  if (daysPassed === 0) return 'Today';
  if (daysPassed === 1) return 'Yesterday';
  if (daysPassed <= 7) return `${daysPassed} days ago`;

  return new Intl.DateTimeFormat(locale).format(date);
};

const formatCur = function (value, locale, currency) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

const resetSessionTimer = function () {
  if (timer) clearInterval(timer);
  timer = startLogOutTimer();
};

/////////////////////////////////////////////////
// UI

const setSortButtonLabel = function () {
  btnSort.textContent = sorted ? 'By date' : 'By amount';
};

const displayMovements = function (acc, sort = false) {
  containerMovements.innerHTML = '';

  let rows = acc.movements.map((mov, i) => ({
    movement: mov,
    movementDate: acc.movementsDates.at(i),
  }));

  if (activeFilter === 'deposit') {
    rows = rows.filter(row => row.movement > 0);
  }

  if (activeFilter === 'withdrawal') {
    rows = rows.filter(row => row.movement < 0);
  }

  // Default: newest first. Sort mode: highest amount → lowest.
  if (sort) {
    rows.sort((a, b) => b.movement - a.movement);
  } else {
    rows.sort(
      (a, b) => new Date(b.movementDate) - new Date(a.movementDate),
    );
  }

  if (rows.length === 0) {
    containerMovements.innerHTML =
      '<p class="movements__empty">No transactions for this filter.</p>';
    return;
  }

  rows.forEach(function (row) {
    const type = row.movement > 0 ? 'deposit' : 'withdrawal';
    const date = new Date(row.movementDate);
    const displayDate = formatMovementDate(date, acc.locale);
    const formattedMov = formatCur(row.movement, acc.locale, acc.currency);

    const html = `
      <div class="movements__row">
        <div class="movements__type movements__type--${type}">
          ${type === 'deposit' ? 'In' : 'Out'}
        </div>
        <div class="movements__date">${displayDate}</div>
        <div class="movements__value">${formattedMov}</div>
      </div>
    `;

    containerMovements.insertAdjacentHTML('beforeend', html);
  });
};

const calcDisplayBalance = function (acc) {
  acc.balance = acc.movements.reduce((sum, mov) => sum + mov, 0);
  labelBalance.textContent = formatCur(acc.balance, acc.locale, acc.currency);
};

const calcDisplaySummary = function (acc) {
  const incomes = acc.movements
    .filter(mov => mov > 0)
    .reduce((sum, mov) => sum + mov, 0);
  labelSumIn.textContent = formatCur(incomes, acc.locale, acc.currency);

  const out = acc.movements
    .filter(mov => mov < 0)
    .reduce((sum, mov) => sum + mov, 0);
  labelSumOut.textContent = formatCur(Math.abs(out), acc.locale, acc.currency);

  const interest = acc.movements
    .filter(mov => mov > 0)
    .map(deposit => (deposit * acc.interestRate) / 100)
    .filter(int => int >= 1)
    .reduce((sum, int) => sum + int, 0);
  labelSumInterest.textContent = formatCur(interest, acc.locale, acc.currency);
};

const updateUI = function (acc) {
  displayMovements(acc, sorted);
  calcDisplayBalance(acc);
  calcDisplaySummary(acc);
};

const showApp = function () {
  containerLogin.classList.add('login-screen--hidden');
  containerApp.classList.remove('app--hidden');
  containerSession.classList.remove('session--hidden');
};

const hideApp = function () {
  containerLogin.classList.remove('login-screen--hidden');
  containerApp.classList.add('app--hidden');
  containerSession.classList.add('session--hidden');
  labelWelcome.textContent = 'Sign in to your account';
};

const logout = function (message = 'You have been logged out.') {
  if (timer) clearInterval(timer);
  currentAccount = undefined;
  sorted = false;
  activeFilter = 'all';
  setSortButtonLabel();

  filterButtons.forEach(btn =>
    btn.classList.toggle('filter__btn--active', btn.dataset.filter === 'all'),
  );

  hideApp();
  showToast(message, 'success');
};

const startLogOutTimer = function () {
  let time = 300;

  const tick = function () {
    const min = String(Math.trunc(time / 60)).padStart(2, '0');
    const sec = String(time % 60).padStart(2, '0');
    labelTimer.textContent = `${min}:${sec}`;

    if (time === 0) {
      clearInterval(timer);
      logout('Session expired. Please sign in again.');
    }

    time--;
  };

  tick();
  timer = setInterval(tick, 1000);
  return timer;
};

/////////////////////////////////////////////////
// EVENTS

formLogin.addEventListener('submit', function (e) {
  e.preventDefault();

  currentAccount = accounts.find(
    acc => acc.username === inputLoginUsername.value.trim().toLowerCase(),
  );

  if (currentAccount?.pin === +inputLoginPin.value) {
    labelWelcome.textContent = `Welcome back, ${
      currentAccount.owner.split(' ')[0]
    }`;
    labelAvatar.textContent = getInitials(currentAccount.owner);

    const now = new Date();
    labelDate.textContent = new Intl.DateTimeFormat(currentAccount.locale, {
      hour: 'numeric',
      minute: 'numeric',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now);

    inputLoginUsername.value = inputLoginPin.value = '';
    inputLoginPin.blur();

    sorted = false;
    activeFilter = 'all';
    setSortButtonLabel();
    filterButtons.forEach(btn =>
      btn.classList.toggle('filter__btn--active', btn.dataset.filter === 'all'),
    );

    showApp();
    updateUI(currentAccount);
    resetSessionTimer();
    showToast(`Signed in as ${currentAccount.owner}`);
  } else {
    showToast('Wrong username or PIN.', 'error');
  }
});

btnLogout.addEventListener('click', function () {
  logout('Logged out successfully.');
});

formTransfer.addEventListener('submit', function (e) {
  e.preventDefault();

  const amount = +inputTransferAmount.value;
  const receiverAcc = accounts.find(
    acc => acc.username === inputTransferTo.value.trim().toLowerCase(),
  );

  inputTransferAmount.value = inputTransferTo.value = '';

  if (
    amount > 0 &&
    receiverAcc &&
    currentAccount.balance >= amount &&
    receiverAcc.username !== currentAccount.username
  ) {
    currentAccount.movements.push(-amount);
    receiverAcc.movements.push(amount);
    currentAccount.movementsDates.push(new Date().toISOString());
    receiverAcc.movementsDates.push(new Date().toISOString());

    updateUI(currentAccount);
    resetSessionTimer();
    showToast(
      `Transferred ${formatCur(
        amount,
        currentAccount.locale,
        currentAccount.currency,
      )} to ${receiverAcc.owner}`,
    );
  } else {
    showToast('Transfer failed. Check recipient and amount.', 'error');
  }
});

formLoan.addEventListener('submit', function (e) {
  e.preventDefault();

  const amount = Math.floor(+inputLoanAmount.value);

  if (amount > 0 && currentAccount.movements.some(mov => mov >= amount * 0.1)) {
    showToast('Loan request received. Processing...');

    setTimeout(function () {
      if (!currentAccount) return;

      currentAccount.movements.push(amount);
      currentAccount.movementsDates.push(new Date().toISOString());
      updateUI(currentAccount);
      resetSessionTimer();
      showToast(
        `Loan approved: ${formatCur(
          amount,
          currentAccount.locale,
          currentAccount.currency,
        )}`,
      );
    }, 2500);
  } else {
    showToast('Loan denied. Need a deposit of at least 10%.', 'error');
  }

  inputLoanAmount.value = '';
});

formClose.addEventListener('submit', function (e) {
  e.preventDefault();

  if (
    inputCloseUsername.value.trim().toLowerCase() === currentAccount.username &&
    +inputClosePin.value === currentAccount.pin
  ) {
    const index = accounts.findIndex(
      acc => acc.username === currentAccount.username,
    );

    accounts.splice(index, 1);
    inputCloseUsername.value = inputClosePin.value = '';
    logout('Account closed.');
  } else {
    showToast('Could not close account. Check credentials.', 'error');
    inputCloseUsername.value = inputClosePin.value = '';
  }
});

btnSort.addEventListener('click', function (e) {
  e.preventDefault();
  sorted = !sorted;
  setSortButtonLabel();
  displayMovements(currentAccount, sorted);
});

filterButtons.forEach(btn =>
  btn.addEventListener('click', function () {
    activeFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.remove('filter__btn--active'));
    btn.classList.add('filter__btn--active');
    displayMovements(currentAccount, sorted);
  }),
);
