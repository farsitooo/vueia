// Variables globales
let isLoggedIn = false;
let currentUser = null;
let model = null;
let webcam = null;
let canvas = null;
let labelContainer = null;
let detectionCount = 0;
let lastDetection = null;

// URL del modelo de Teachable Machine
const modelURL = 'https://teachablemachine.withgoogle.com/models/2Y6Ij0JN6/';
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:3000/api`
  : '/api';

// Elementos del DOM
const loginForm = document.getElementById('login');
const registerForm = document.getElementById('register');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const authContainer = document.getElementById('auth-container');
const aiContainer = document.getElementById('ai-container');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const formContainers = document.querySelectorAll('.form-container');
const predictionResult = document.getElementById('prediction-result');

// Función para validar inputs contra SQLi
function detectSQLi(input) {
  if (!input || typeof input !== 'string') return false;
  
  // Patrones comunes de SQLi
  const sqlInjectionPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|ORDER BY)(\s|$)/i,
    /'--/i,
    /\/\*.*\*\//i,
    /;(\s|$)/,
    /'(\s|)*OR(\s|)*'(\s|)*=(\s|)*'/i,
    /'(\s|)*OR(\s|)*1(\s|)*=(\s|)*1/i,
    /"\s*OR\s*".*"\s*=\s*"/i,
    /"\s*OR\s*1\s*=\s*1/i,
    /'\s*OR\s*'\d+'\s*=\s*'\d+/i,
    /SLEEP\(\d+\)/i,
    /BENCHMARK\(\d+,.*\)/i,
    /WAITFOR DELAY '\d+:\d+:\d+'/i
  ];
  
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

// Respuestas divertidas para intentos de SQLi
const funnyResponses = [
  "¿Ah, sí? Intento de Script Kiddie, ve y aprende de s4vitar un poco, quedaste en la base de datos. ¡Es broma! 😉",
  "SQLi en 2024? ¿En serio? Mejor aprende a programar, quedaste registrado. (No es cierto, pero suena intimidante, ¿no?)",
  "SELECT * FROM hackers WHERE skill = 'novato' AND need_practice = TRUE; ... ¡Te encontré!",
  "Oh, qué tierno. Un intento de inyección SQL. Mi abuela hackea mejor, y ella piensa que SQL es una marca de detergente.",
  "DROP TABLE estudiantes; -- Ups, ¿creíste que funcionaría? Ve a hacer el curso de s4vitar y vuelve cuando seas pro.",
  "¿Sabías que cada intento de SQLi hace llorar a un programador? Piensa en los programadores. Sé amable."
];

// Obtener una respuesta aleatoria para intentos de SQLi
function getRandomSQLiResponse() {
  const randomIndex = Math.floor(Math.random() * funnyResponses.length);
  return funnyResponses[randomIndex];
}

// Función para mostrar mensajes
function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.className = 'message';
  element.classList.add(isError ? 'error' : 'success');
  
  // Añadir animación de aparición
  element.style.opacity = '0';
  element.style.transform = 'translateY(-10px)';
  element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  setTimeout(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, 10);
  
  setTimeout(() => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      element.textContent = '';
      element.className = 'message';
    }, 300);
  }, 5000);
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    // Mostrar un indicador de carga durante la verificación
    authContainer.innerHTML += '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Verificando sesión...</div>';
    
    fetch(`${API_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('No autenticado');
      }
    })
    .then(data => {
      currentUser = data;
      isLoggedIn = true;
      showAIInterface();
    })
    .catch(error => {
      console.error('Error de autenticación:', error);
      localStorage.removeItem('token');
      showAuthInterface();
    })
    .finally(() => {
      // Eliminar el indicador de carga
      const loadingIndicator = document.querySelector('.loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
    });
  } else {
    showAuthInterface();
  }
}

// Función para mostrar la interfaz de autenticación
function showAuthInterface() {
  // Preparar para la transición
  authContainer.style.opacity = '0';
  authContainer.style.transform = 'translateY(20px)';
  aiContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
  
  // Aplicar la transición
  setTimeout(() => {
    authContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    authContainer.style.opacity = '1';
    authContainer.style.transform = 'translateY(0)';
  }, 10);
  
  // Resetear los formularios
  loginForm.reset();
  registerForm.reset();
}

// Función para mostrar la interfaz de IA
function showAIInterface() {
  // Preparar para la transición
  aiContainer.style.opacity = '0';
  aiContainer.style.transform = 'translateY(20px)';
  authContainer.classList.add('hidden');
  aiContainer.classList.remove('hidden');
  
  // Aplicar la transición
  setTimeout(() => {
    aiContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    aiContainer.style.opacity = '1';
    aiContainer.style.transform = 'translateY(0)';
  }, 10);
  
  // Mostrar nombre de usuario
  usernameDisplay.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
  
  // Mostrar logros
  updateAchievementsDisplay();
  
  // Mostrar días de racha si existe
  if (currentUser.login_streak) {
    const streakBadge = document.createElement('div');
    streakBadge.className = 'streak-badge';
    streakBadge.innerHTML = `<i class="fas fa-fire"></i> Racha: ${currentUser.login_streak} día${currentUser.login_streak !== 1 ? 's' : ''}`;
    document.querySelector('.user-info').appendChild(streakBadge);
  }
  
  // Iniciar el modelo de IA
  initTeachableMachine();
}

// Función para mostrar los logros del usuario
function updateAchievementsDisplay() {
  // Comprobar si existe el contenedor de logros
  let achievementsContainer = document.getElementById('achievements-container');
  
  // Si no existe, crearlo
  if (!achievementsContainer) {
    // Crear y añadir sección de logros
    achievementsContainer = document.createElement('div');
    achievementsContainer.id = 'achievements-container';
    achievementsContainer.className = 'achievements-container';
    achievementsContainer.innerHTML = '<h3><i class="fas fa-trophy"></i> Mis Logros</h3><div class="achievements-list"></div>';
    
    // Insertar antes del contenedor de webcam
    const webcamContainer = document.querySelector('.webcam-container');
    aiContainer.insertBefore(achievementsContainer, webcamContainer);
  }
  
  // Mostrar logros solo si el usuario los tiene
  const achievementsList = achievementsContainer.querySelector('.achievements-list');
  achievementsList.innerHTML = '';
  
  if (currentUser.achievements && currentUser.achievements.length > 0) {
    currentUser.achievements.forEach(achievement => {
      const isComplete = achievement.completed;
      
      const achievementItem = document.createElement('div');
      achievementItem.className = `achievement-item ${isComplete ? 'completed' : 'in-progress'}`;
      
      achievementItem.innerHTML = `
        <div class="achievement-icon"><i class="${achievement.icon || 'fas fa-award'}"></i></div>
        <div class="achievement-info">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-description">${achievement.description}</div>
          ${!isComplete ? `<div class="achievement-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(100, (achievement.progress / getAchievementTarget(achievement.achievement_id)) * 100)}%"></div>
            </div>
            <div class="progress-text">${achievement.progress}/${getAchievementTarget(achievement.achievement_id)}</div>
          </div>` : '<div class="achievement-completed"><i class="fas fa-check-circle"></i> Completado</div>'}
        </div>
      `;
      
      achievementsList.appendChild(achievementItem);
    });
  } else {
    // Si no tiene logros, mostrar mensaje
    achievementsList.innerHTML = '<div class="no-achievements">No tienes logros todavía. ¡Sigue usando la aplicación para desbloquearlos!</div>';
  }
}

// Función para obtener el objetivo de cada logro
function getAchievementTarget(achievementId) {
  const targets = {
    'first_login': 1,
    'daily_login': 5,
    'detection_master': 10,
    'profile_complete': 1,
    'security_aware': 1
  };
  
  return targets[achievementId] || 1;
}

// Función para registrar una detección con alta confianza
async function recordDetection() {
  if (!isLoggedIn || !currentUser.id) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/detection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Actualizar el usuario local si hay cambios
      if (currentUser.achievements) {
        const detectionAchievement = currentUser.achievements.find(a => a.achievement_id === 'detection_master');
        
        if (detectionAchievement) {
          detectionAchievement.progress = data.progress;
          detectionAchievement.completed = data.completed;
        } else {
          // Si no existe, añadirlo
          currentUser.achievements.push({
            achievement_id: 'detection_master',
            user_id: currentUser.id,
            unlocked_at: new Date(),
            progress: data.progress,
            completed: data.completed,
            name: 'Maestro de Detección',
            description: 'Realizar 10 detecciones con más del 90% de confianza',
            icon: 'fas fa-medal'
          });
        }
        
        // Actualizar la visualización de logros
        updateAchievementsDisplay();
        
        // Mostrar notificación si se completó
        if (data.completed && detectionAchievement && !detectionAchievement.completed) {
          showAchievementNotification('¡Logro desbloqueado!', 'Maestro de Detección');
        }
      }
    }
  } catch (error) {
    console.error('Error al registrar detección:', error);
  }
}

// Función para mostrar notificaciones de logro
function showAchievementNotification(title, achievementName) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="achievement-notification-icon"><i class="fas fa-trophy"></i></div>
    <div class="achievement-notification-content">
      <div class="achievement-notification-title">${title}</div>
      <div class="achievement-notification-name">${achievementName}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 100);
  
  // Remover después de unos segundos
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
}

// Eventos para los formularios
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  // Validar contra SQLi antes de enviar
  if (detectSQLi(username) || detectSQLi(password)) {
    showMessage(loginMessage, getRandomSQLiResponse(), true);
    // Efecto visual de sacudida en los campos
    const fields = [document.getElementById('login-username'), document.getElementById('login-password')];
    fields.forEach(field => {
      field.style.border = '1px solid #aa5042';
      field.classList.add('shake-animation');
      setTimeout(() => {
        field.classList.remove('shake-animation');
        field.style.border = '';
      }, 1000);
    });
    console.log('Intento potencial de SQLi detectado en el cliente');
    return;
  }
  
  // Deshabilitar el botón y mostrar indicador de carga
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando...';
  
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      isLoggedIn = true;
      showMessage(loginMessage, 'Acceso correcto');
      setTimeout(() => {
        showAIInterface();
      }, 1000);
    } else {
      showMessage(loginMessage, data.error || 'Credenciales incorrectas', true);
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage(loginMessage, 'Error de conexión', true);
  } finally {
    // Restaurar el botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  // Validar contra SQLi antes de enviar
  if (detectSQLi(username) || detectSQLi(email) || detectSQLi(password)) {
    showMessage(registerMessage, getRandomSQLiResponse(), true);
    // Efecto visual de sacudida en los campos
    const fields = [
      document.getElementById('register-username'), 
      document.getElementById('register-email'), 
      document.getElementById('register-password')
    ];
    fields.forEach(field => {
      field.style.border = '1px solid #aa5042';
      field.classList.add('shake-animation');
      setTimeout(() => {
        field.classList.remove('shake-animation');
        field.style.border = '';
      }, 1000);
    });
    console.log('Intento potencial de SQLi detectado en el cliente');
    return;
  }
  
  // Deshabilitar el botón y mostrar indicador de carga
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Registrando...';
  
  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      currentUser = data.user;
      isLoggedIn = true;
      showMessage(registerMessage, 'Registro exitoso');
      setTimeout(() => {
        showAIInterface();
      }, 1000);
    } else {
      showMessage(registerMessage, data.error || 'Error al registrarse', true);
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage(registerMessage, 'Error de conexión', true);
  } finally {
    // Restaurar el botón
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

// Evento para cerrar sesión
logoutBtn.addEventListener('click', () => {
  // Animación de salida
  aiContainer.style.opacity = '0';
  aiContainer.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    localStorage.removeItem('token');
    isLoggedIn = false;
    currentUser = null;
    
    if (webcam) {
      webcam.stop();
    }
    
    showAuthInterface();
  }, 300);
});

// Eventos para las pestañas
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    
    tabBtns.forEach(b => b.classList.remove('active'));
    formContainers.forEach(f => {
      f.style.opacity = '0';
      f.classList.remove('active');
    });
    
    btn.classList.add('active');
    const activeForm = document.getElementById(`${tab}-form`);
    activeForm.classList.add('active');
    
    // Animar la transición del formulario
    setTimeout(() => {
      activeForm.style.transition = 'opacity 0.3s ease';
      activeForm.style.opacity = '1';
    }, 10);
  });
});

// Funciones para Teachable Machine
async function initTeachableMachine() {
  // Mostrar indicador de carga
  predictionResult.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cargando modelo...';
  
  const modelJsonURL = modelURL + 'model.json';
  const metadataURL = modelURL + 'metadata.json';
  
  try {
    model = await tmImage.load(modelJsonURL, metadataURL);
    console.log('Modelo cargado');
    predictionResult.innerHTML = 'Iniciando cámara...';
    
    webcam = new tmImage.Webcam(640, 480, true);
    await webcam.setup();
    await webcam.play();
    document.getElementById('webcam').srcObject = webcam.canvas.captureStream();
    
    predictionResult.innerHTML = 'Esperando análisis...';
    
    // Iniciar la predicción
    window.requestAnimationFrame(loop);
  } catch (error) {
    console.error('Error al cargar el modelo:', error);
    predictionResult.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error al cargar el modelo de IA';
  }
}

async function loop() {
  if (!isLoggedIn) return;
  
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  if (!model || !webcam) return;
  
  const prediction = await model.predict(webcam.canvas);
  let maxProbability = 0;
  let bestClass = '';
  
  prediction.forEach(p => {
    if (p.probability > maxProbability) {
      maxProbability = p.probability;
      bestClass = p.className;
    }
  });
  
  // Si la predicción es de alta confianza
  if (maxProbability > 0.9) {
    predictionResult.innerHTML = `<strong>${bestClass}</strong> <span class="probability">(${(maxProbability * 100).toFixed(1)}%)</span>`;
    
    // Registrar detección de alta confianza
    if (lastDetection !== bestClass) {
      lastDetection = bestClass;
      recordDetection();
      detectionCount++;
    }
  } 
  // Si la predicción es de confianza normal
  else if (maxProbability > 0.8) {
    predictionResult.innerHTML = `<strong>${bestClass}</strong> <span class="probability">(${(maxProbability * 100).toFixed(1)}%)</span>`;
  } 
  // Si la predicción es de baja confianza
  else {
    predictionResult.innerHTML = '<i class="fas fa-search"></i> Analizando...';
    lastDetection = null;
  }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Añadir estilos
  const style = document.createElement('style');
  style.textContent = `
    .probability {
      font-size: 0.9em;
      color: var(--text-light);
    }
    
    .loading-indicator {
      text-align: center;
      padding: 20px;
      color: var(--text-light);
    }
    
    /* Estilos para logros */
    .achievements-container {
      background: white;
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid var(--border-color);
    }
    
    .achievements-container h3 {
      margin-bottom: 15px;
      color: var(--text-color);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .achievements-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 15px;
    }
    
    .achievement-item {
      display: flex;
      background: var(--secondary-color);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      gap: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .achievement-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .achievement-item.completed {
      background: rgba(104, 143, 78, 0.1);
      border-color: rgba(104, 143, 78, 0.3);
    }
    
    .achievement-icon {
      font-size: 24px;
      color: var(--primary-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: white;
      border: 1px solid var(--border-color);
    }
    
    .achievement-item.completed .achievement-icon {
      color: var(--success-color);
      border-color: var(--success-color);
    }
    
    .achievement-info {
      flex: 1;
    }
    
    .achievement-name {
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .achievement-description {
      font-size: 13px;
      color: var(--text-light);
      margin-bottom: 8px;
    }
    
    .achievement-progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .progress-bar {
      height: 6px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 3px;
      transition: width 0.5s ease;
    }
    
    .progress-text {
      font-size: 12px;
      color: var(--text-light);
      text-align: right;
    }
    
    .achievement-completed {
      font-size: 13px;
      color: var(--success-color);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .no-achievements {
      grid-column: 1 / -1;
      padding: 15px;
      text-align: center;
      color: var(--text-light);
      font-style: italic;
    }
    
    /* Racha de login */
    .streak-badge {
      background: var(--primary-color);
      color: white;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      box-shadow: var(--shadow);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    /* Notificaciones de logro */
    .achievement-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
      display: flex;
      padding: 15px;
      z-index: 1000;
      transform: translateX(100%);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
      border-left: 4px solid var(--primary-color);
      max-width: 300px;
    }
    
    .achievement-notification-icon {
      font-size: 24px;
      color: var(--primary-color);
      margin-right: 12px;
    }
    
    .achievement-notification-title {
      font-weight: 600;
      margin-bottom: 3px;
    }
    
    .achievement-notification-name {
      font-size: 14px;
      color: var(--text-light);
    }
  `;
  document.head.appendChild(style);
  
  // Verificar autenticación
  checkAuth();
}); 