'use strict';

class Workout {
  id = Math.floor(Math.random() * 10000) + '';

  constructor(coords, distance, duration, restore, date) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.restore = restore;

    if (!restore) {
      this.date = new Date();
    } else {
      this.date = new Date(date);
    }
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    return this.description;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, restore, date) {
    super(coords, distance, duration, restore, date);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain, restore, date) {
    super(coords, distance, duration, restore, date);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const containerWorkouts = document.querySelector('.workouts');
const form = document.querySelector('.form');
const editForm = document.querySelector('.edit-form');
const inputType = document.querySelector('.form__input--type');
const editInputType = document.querySelector('.edit-form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const editInputDistance = document.querySelector('.edit-form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const editInputDuration = document.querySelector('.edit-form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const editInputCadence = document.querySelector('.edit-form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const editInputElevation = document.querySelector('.edit-form__input--elev');
const btnDeleteAll = document.querySelector('.delete-all-workouts');

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #editId;
  #editType;
  deleteClickCount = 1;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    console.log(this.#workouts);

    inputType.addEventListener('change', this._toggleElevationField);

    form.addEventListener('submit', this._newWorkout.bind(this));
    editForm.addEventListener('submit', this._submitEdited.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._requestEditWorkout.bind(this)
    );

    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert('could not get position')
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // const coords = [41.49768229347175, -81.71431472757831];
    // Whiskey Island 😏 ^

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // add handler after map is loaded
    this.#map.on('click', this._showForm.bind(this));

    // get local storage
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapEv) {
    this.#mapEvent = mapEv;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.style.display = 'none';
    setTimeout(() => (form.style.display = 'grid'), 1000);
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _editToggleElevationField(workout) {
    if (workout.type === 'running') {
      editInputElevation
        .closest('.edit-form__row')
        .classList.add('edit-fr--hidden');
      editInputCadence
        .closest('.edit-form__row')
        .classList.remove('edit-fr--hidden');
    }
    if (workout.type === 'cycling') {
      editInputElevation
        .closest('.edit-form__row')
        .classList.remove('edit-fr--hidden');
      editInputCadence
        .closest('.edit-form__row')
        .classList.add('edit-fr--hidden');
    }
  }

  // helpers
  _validInput(...inputs) {
    return inputs.every(input => Number.isFinite(input));
  }
  _allPositive(...inputs) {
    return inputs.every(input => input > 0);
  }

  _newWorkout(ev) {
    ev.preventDefault();
    // store inputs/other necessary variables
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const restore = false;

    let workout;
    // validate data, create appropriate object, push to #workouts
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!this._validInput(distance, duration, cadence))
        return alert(`Nahh. Numbers only.`);
      if (!this._allPositive(distance, duration, cadence))
        return alert(`All inputs must be positive.`);

      workout = new Running([lat, lng], distance, duration, cadence, restore);
    }
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (!this._validInput(distance, duration, elevationGain))
        return alert(`Nahh. Numbers only.`);
      if (!this._allPositive(distance, duration))
        return alert(`Distance and duration must be positive.`);

      workout = new Cycling(
        [lat, lng],
        distance,
        duration,
        elevationGain,
        restore
      );
    }

    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage(workout);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          maxWidth: 200,
          maxHeight: 50,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  // data-count attribute, for editing localStorage objects
  increaseCount() {
    const existing = document.querySelectorAll('.workout').length;
    return existing;
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${
        workout.type
      }" data-count="${this.increaseCount()}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value editDistance">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value editDuration">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value editPace">${workout.pace.toFixed(
            1
          )}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value editCadence">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value editSpeed">${workout.speed.toFixed(
            1
          )}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value editElevation">${
            workout.elevationGain
          }</span>
          <span class="workout__unit">m</span>
        </div>
      `;
    }
    html += `
        <div class="line-break"></div>
        <div class="workout__edit" data-id="${workout.id}">
          <span class="workout__icon">😅</span>
          <span class="workout__unit">Edit Workout</span>
        </div>
        <div class="workout__delete" data-id="${workout.id}">
          <span class="workout__icon">🗑</span>
          <span class="workout__unit">Delete Workout</span>
        </div>
      </li>
    `;

    editForm.insertAdjacentHTML('afterend', html);
  }

  // helper (DRY)
  _findWorkout(theTarget) {
    return this.#workouts.find(work => work.id === theTarget.dataset.id);
  }

  _moveToPopup(ev) {
    const theTarget = ev.target.closest('.workout');
    if (!theTarget) return;

    const foundWorkout = this._findWorkout(theTarget);

    this.#map.setView(foundWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _requestEditWorkout(ev) {
    const theTarget = ev.target.closest('.workout__edit');
    if (!theTarget) return;

    const foundWorkout = this._findWorkout(theTarget);

    this._showEditForm(foundWorkout);
  }

  _showEditForm(workout) {
    editForm.classList.remove('hidden');

    this._editToggleElevationField(workout);

    // take stored inputs, put into the fields
    editInputDistance.value = workout.distance;
    editInputDuration.value = workout.duration;
    if (workout.type === 'running') editInputCadence.value = workout.cadence;
    if (workout.type === 'cycling')
      editInputElevation.value = workout.elevationGain;

    editInputDistance.focus();

    this.#editId = workout.id;
    this.#editType = workout.type;
  }
  _hideEditForm() {
    // prettier-ignore
    editInputDistance.value = editInputDuration.value = editInputCadence.value = editInputElevation.value = '';

    editForm.style.display = 'none';
    setTimeout(() => (editForm.style.display = 'grid'), 1000);
    editForm.classList.add('hidden');
  }

  _submitEdited(ev) {
    ev.preventDefault();

    const type = this.#editType;

    // store user input
    const distance = +editInputDistance.value;
    const duration = +editInputDuration.value;
    let workout;

    if (type === 'running') {
      const cadence = +editInputCadence.value;
      // validate inputs
      if (!this._validInput(distance, duration, cadence))
        return alert(`Nahh. Numbers only.`);
      if (!this._allPositive(distance, duration, cadence))
        return alert(`All inputs must be positive.`);

      // find the object
      workout = this.#workouts.find(work => work.id === this.#editId);

      // overwrite the properties
      workout.cadence = cadence;
      workout.distance = distance;
      workout.duration = duration;
      workout.restore = true;
    }
    if (type === 'cycling') {
      const elevationGain = +editInputElevation.value;
      // validate inputs
      if (!this._validInput(distance, duration, elevationGain))
        return alert(`Nahh. Numbers only.`);
      if (!this._allPositive(distance, duration))
        return alert(`Distance and duration must be positive.`);

      // find the object
      workout = this.#workouts.find(work => work.id === this.#editId);

      // overwrite the properties
      workout.elevationGain = elevationGain;
      workout.distance = distance;
      workout.duration = duration;
      workout.restore = true;
    }

    this._hideEditForm();

    this._reRenderWorkout(workout);

    this._editLocalStorage(workout);
  }

  _reRenderWorkout(workout) {
    const allWorkouts = document.querySelectorAll('.workout');
    let workoutElement;

    // find the li element that matches the selected workout
    allWorkouts.forEach(el => {
      if (el.dataset.id === workout.id) workoutElement = el;
      return workoutElement;
    });

    // update UI: distance & duration
    const editDistanceEL = workoutElement.querySelector('.editDistance');
    const editDurationEL = workoutElement.querySelector('.editDuration');
    editDistanceEL.innerHTML = workout.distance;
    editDurationEL.innerHTML = workout.duration;

    // update UI: pace & cadence
    if (workout.type === 'running') {
      const editPaceEL = workoutElement.querySelector('.editPace');
      const editCadenceEL = workoutElement.querySelector('.editCadence');

      // recalculate pace
      const pace = workout.duration / workout.distance;
      editPaceEL.innerHTML = pace.toFixed(1);

      editCadenceEL.innerHTML = workout.cadence;
    }

    // update UI: speed & elevation
    if (workout.type === 'cycling') {
      const editSpeedEL = workoutElement.querySelector('.editSpeed');
      const editElevationEL = workoutElement.querySelector('.editElevation');

      // recalculate speed
      const speed = workout.distance / (workout.duration / 60);
      editSpeedEL.innerHTML = speed.toFixed(1);

      editElevationEL.innerHTML = workout.elevationGain;
    }
  }
  // helper (DRY)
  _findElement(workout) {
    const nodeToArr = Array.from(document.querySelectorAll('.workout'));
    return nodeToArr.find(el => el.dataset.id === workout.id);
  }

  _deleteWorkout(ev) {
    const theTarget = ev.target.closest('.workout__delete');
    if (!theTarget) return;

    // = object from #workouts[]
    const foundWorkout = this._findWorkout(theTarget);
    console.log(foundWorkout);

    // = li DOM element to delete
    const foundElement = this._findElement(foundWorkout);
    console.log(foundElement);

    // display dialog box + guard clause
    const result = window.confirm('Are you sure?');
    if (!result) return;

    // remove from localStorage
    localStorage.removeItem(foundElement.dataset.count);

    // remove foundWorkout from #workouts[]
    const nodeToArr = Array.from(document.querySelectorAll('.workout'));
    const deleteIndex = nodeToArr.findIndex(
      el => el.dataset.id === foundWorkout.id
    );
    this.#workouts.splice(deleteIndex, 1);

    // remove entirety of foundElement from the UI
    foundElement.remove();

    // re-assign localStorage keys
    this._reassignKeys();

    // reload page
    location.reload();
  }

  _reassignKeys() {
    // pull everything out of local storage
    let data = [];
    for (let i = 0; i < localStorage.length + 2; i++)
      data.push(JSON.parse(localStorage.getItem(i)));

    // reset localStorage
    localStorage.clear();

    // remove falsy values
    data = data.filter(item => item);

    // populate local storage
    data.forEach((d, i) => localStorage.setItem(i, JSON.stringify(d)));
  }

  _deleteAllWorkouts() {
    const answer = prompt(
      `Are you sure you want to delete all of your workouts? Type "yes"`
    );
    const mutatedAnswer = answer.toLowerCase().trim();

    if (mutatedAnswer === 'yes') {
      app.reset();
    }
  }

  _editLocalStorage(workout) {
    // match the li DOM element to the workout that's being edited
    const foundElement = this._findElement(workout);
    const keyToEdit = +foundElement.dataset.count;

    // get the data from localStorage
    const data = JSON.parse(localStorage.getItem(keyToEdit));

    // mutate the object
    data.distance = workout.distance;
    data.duration = workout.duration;
    data.restore = true;
    if (workout.type === 'running') {
      data.cadence = workout.cadence;
      data.pace = workout.duration / workout.distance;
    }
    if (workout.type === 'cycling') {
      data.elevationGain = workout.elevationGain;
      data.speed = workout.distance / (workout.duration / 60);
    }
    // console.log(data);

    // put the object back into localStorage
    localStorage.setItem(keyToEdit, JSON.stringify(data));
  }

  // invoked in _newWorkout
  _setLocalStorage(workout) {
    const numExisting = document.querySelectorAll('.workout').length - 1;
    // assign count ⌄ based on number of existing li DOM elements ^
    localStorage.setItem(numExisting, JSON.stringify(workout));
  }

  // invoked on page load
  _getLocalStorage() {
    let data = [];
    for (let i = 0; i < localStorage.length + 10; i++)
      data.push(JSON.parse(localStorage.getItem(i)));

    // if (!data) return; // [] = truthy
    if (data.length === 0) return;
    let workout;

    // remove any deleted single workouts
    data = data.filter(item => item);
    // console.log(data);

    data.forEach(d => {
      d.restore = true;
      if (d.type === 'running')
        // prettier-ignore
        workout = new Running(d.coords, d.distance, d.duration, d.cadence, d.restore, d.date);
      if (d.type === 'cycling')
        // prettier-ignore
        workout = new Cycling(d.coords, d.distance, d.duration, d.elevationGain, d.restore, d.date);
      this.#workouts.push(workout);
    });

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.clear();
    location.reload();
  }
}
const app = new App();
