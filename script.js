'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

////////////////////////
//    Workout class   //
////////////////////////

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = date;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    // console.log(this.date.getDate());
  }

  click() {
    this.clicks++;
  }
}

////////////////////////
//   Running   //
////////////////////////

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min / km
    this.pace = this.duration / this.distance;
  }
}

////////////////////////
//   Cycling  //
////////////////////////

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, ElevationGain) {
    super(coords, distance, duration);
    this.ElevationGain = ElevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 5.2, 24, 178);
// console.log(run1);
// console.log(cycling1);

////////////////////////////
// Application Ahitecture///
////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const DeleteButton = document.querySelector('.delete--all');
const ShowAllWorkoutsOnMap = document.querySelector('.view--all--workouts');
const SortBy = document.querySelector('#by');
const SortOrder = document.querySelector('#order');

let markersLayerGroup;
let sortedArray;
let index;
let markers = [];

class App {
  // Private variables

  #map;
  #mapZoomLevel = 13;
  #MapEvent;
  #workouts = [];
  #editing = false;
  constructor() {
    // Get user position
    this._getPosition();

    //Get data form local storage
    this._getLocalStorage();

    // Attach event handlers

    // Form submit for edit or new workout

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.#editing) {
        this._newWorkout(e);
      } else {
        console.log(this.#editing);
        this._UpdateWorkout(e);
      }
    });

    // Change the form between running and cyclingf

    inputType.addEventListener('change', this._toggleElevationField);

    // Button to delete all

    DeleteButton.addEventListener('click', this._deleteAll.bind(this));

    // Move to popUp of the workout

    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));

    // Delete a selected workout

    containerWorkouts.addEventListener('click', this._delete.bind(this));

    // Edit an selected workout

    containerWorkouts.addEventListener('click', this._edit.bind(this));

    // Sorting

    SortBy.addEventListener('change', this._sort.bind(this));

    SortOrder.addEventListener('change', this._sortingOrder.bind(this));

    // Show all the workouts on the map

    ShowAllWorkoutsOnMap.addEventListener(
      'click',
      this._ShowAllWorkoutsMarkers.bind(this)
    );
  }

  _RenderArrayWorkouts(Array) {
    Array.forEach(work => {
      form.insertAdjacentHTML('afterend', this._renderWorkout(work));
    });
  }

  // Render Markers on map

  _RenderArrayWorkoutsMarkers(Array) {
    Array.forEach(mark => {
      this._renderWorkoutMarker(mark);
    });
  }
  // Get Position

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  // Loading the map

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // console.log(latitude, longitude);
    // console.log(`https://www.google.com/maps/@${latitude}.${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(map)
    //   .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    //   .openPopup();

    markersLayerGroup = L.layerGroup().addTo(this.#map);

    // Hanbdling click on map
    this.#map.on('click', this._showForm.bind(this));

    this._RenderArrayWorkoutsMarkers(this.#workouts);
  }

  // Showing the form

  _showForm(mapE) {
    this.#MapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hiding the form

  _hideForm() {
    // Empty
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // toglle Elevation Field

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // helper functions

  _validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));

  _allPositive = (...inputs) => inputs.every(input => input > 0);

  // Creating a new workoout

  _newWorkout(e) {
    e.preventDefault();

    // Get data form form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#MapEvent.latlng;

    let workout;

    // if activity is running,create running object

    if (type === 'running') {
      // Check if data is valid
      const cadence = +inputCadence.value;

      if (
        !this._validInputs(distance, duration, cadence) ||
        !this._allPositive(distance, duration, cadence)
      )
        return;

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity is cycling,create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !this._validInputs(distance, duration, elevation) ||
        !this._allPositive(distance, duration)
      )
        return;

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array

    this.#workouts.push(workout);
    // console.log(this.#workouts);

    // Display market

    this._renderWorkoutMarker(workout);

    // Render workout on list

    form.insertAdjacentHTML('afterend', this._renderWorkout(workout));

    // Hide form + clear input filds
    this._hideForm();

    // set local storage all workouts
    this._setLocalStorage();
  }

  // Rendering a markers on the map

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .addTo(markersLayerGroup);

    marker
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    markers.push(marker);
  }

  // Create an html to be rendered on the list

  _renderWorkout(workout) {
    DeleteButton.classList.remove('delete-hidden');

    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <div class="workout__options">
            <button class="workout__option--button edit">Edit</button>
            <button class="workout__option--button delete">Delete</button>
          </div>
        </li>
        `;

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.ElevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <div class="workout__options">
            <button class="workout__option--button edit">Edit</button>
            <button class="workout__option--button delete">Delete</button>
          </div>
        </li>`;
    }
    return html;
    // form.insertAdjacentHTML('afterend', html);
  }

  // Move popup in the center

  _moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    //using the public interface

    // workout.click();
  }

  // Set local storage

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Get local Storage

  _getLocalStorage() {
    // it loses the prototype chaining
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    const temporaryWorkouts = data;
    // this.#workouts = data;
    temporaryWorkouts.forEach(work => {
      let StorageWorkout;

      if (work.type === 'cycling') {
        StorageWorkout = new Cycling(
          [work.coords[0], work.coords[1]],
          work.distance,
          work.duration,
          work.ElevationGain
        );
      }
      if (work.type === 'running') {
        StorageWorkout = new Running(
          [work.coords[0], work.coords[1]],
          work.distance,
          work.duration,
          work.cadence
        );
      }
      this.#workouts.push(StorageWorkout);

      form.insertAdjacentHTML('afterend', this._renderWorkout(StorageWorkout));
    });
  }

  // Reset local storage

  reset() {
    // Reset local storage and displaying current location
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteAll() {
    const EditButtons = document.querySelectorAll('.edit');

    // Deleting woekouts list

    this.empty();

    // Empty workouts array

    this.#workouts = null;

    // Reset local storage and displaying current location

    this.reset();

    // Hiding deleteAll button
    DeleteButton.classList.add('delete-hidden');
  }

  // Empty list

  empty = () => {
    const EditButtons = document.querySelectorAll('.edit');
    [...EditButtons].forEach(work => work.parentElement.parentElement.remove());
  };

  // Delete an workout

  _delete(e) {
    if (e.target.textContent !== 'Delete') return;

    // Delete in array and find the clicked element
    const DeleteButtons = document.querySelectorAll('.delete');
    const index = [...DeleteButtons].findIndex(btn => btn === e.target);

    this.#workouts.splice(this.#workouts.length - index - 1, 1);

    //Delete workout in sidebar
    const parent = DeleteButtons[index].parentElement.parentElement;
    parent.classList.add('deleted');
    setTimeout(() => parent.remove(), 600);

    // Update local storage
    this._setLocalStorage();

    // Render mapContent

    markers.forEach(mark => this.#map.removeLayer(mark));

    this._RenderArrayWorkoutsMarkers(this.#workouts);
  }

  // Edit an workout

  _edit(e) {
    if (e.target.textContent !== 'Edit') return;
    this.#editing = true;
    // Get the element
    const EditButtons = document.querySelectorAll('.edit');
    index = [...EditButtons].findIndex(btn => btn === e.target);

    index = this.#workouts.length - index - 1;

    this._showForm();

    inputDistance.value = this.#workouts[index].distance;
    inputDuration.value = this.#workouts[index].duration;
    if (this.#workouts[index].type === 'running')
      inputCadence.value = this.#workouts[index].cadence;
    if (this.#workouts[index].type === 'cycling')
      inputElevation.value = this.#workouts[index].ElevationGain;
  }

  // Update an workout

  _UpdateWorkout() {
    // Getting the input fields

    const duration = +inputDuration.value;
    const distance = +inputDistance.value;
    const type = inputType.value;
    const lat = this.#workouts[index].coords[0];
    const lng = this.#workouts[index].coords[1];

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !this._validInputs(distance, duration, cadence) ||
        !this._allPositive(distance, duration, cadence)
      )
        return;

      this.#workouts[index] = new Running(
        [lat, lng],
        distance,
        duration,
        cadence
      );
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !this._validInputs(distance, duration, elevation) ||
        !this._allPositive(distance, duration)
      )
        return;

      this.#workouts[index] = new Cycling(
        [lat, lng],
        distance,
        duration,
        elevation
      );
    }

    let EditButtons = document.querySelectorAll('.edit');

    const EditIndex = this.#workouts.length - index - 1;

    let parent = EditButtons[EditIndex].parentElement.parentElement;

    parent.insertAdjacentHTML(
      'beforebegin',
      this._renderWorkout(this.#workouts[index])
    );

    parent.remove();

    // Animation for refresh the edited workout

    EditButtons = document.querySelectorAll('.edit');
    parent = EditButtons[EditIndex].parentElement.parentElement;
    parent.classList.add('opacity-zero');

    setTimeout(() => parent.classList.remove('opacity-zero'), 100);

    // Updating the map

    markers.forEach(mark => this.#map.removeLayer(mark));

    this._RenderArrayWorkoutsMarkers(this.#workouts);

    // Reset edit variable,set locale storage and hiding the form

    this._setLocalStorage();
    this.#editing = false;
    this._hideForm();
  }

  // Sorting functions

  _sort() {
    if (!SortBy.value) {
      console.log(1);
      this.empty();
      this._RenderArrayWorkouts(this.#workouts);
      return;
    }

    sortedArray = this.#workouts;

    this.empty();

    // Sorting by

    if (SortBy.value === 'distance') {
      sortedArray.sort((a, b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return 0;
      });
    } else if (SortBy.value === 'duration') {
      sortedArray.sort((a, b) => {
        if (a.duration < b.duration) return -1;
        if (a.duration > b.duration) return 1;
        return 0;
      });
    } else {
      sortedArray.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });
    }

    // Checking the current order
    if (SortOrder.value === 'asc') sortedArray.reverse();

    // Displaying
    this._RenderArrayWorkouts(sortedArray);
  }

  // Sorting order

  _sortingOrder() {
    this.empty();
    sortedArray.reverse();
    this._RenderArrayWorkouts(sortedArray);
  }

  _ShowAllWorkoutsMarkers() {}
}

const app = new App();

// app._getPosition();
