// ===========================================
// Arquivo principal: main.js
// Contém toda a lógica do aplicativo unificada
// ===========================================

// Configurações do Firebase
// LEMBRE-SE de usar suas próprias chaves de API
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXrIshTVFOD30XPKku_Trk6VKbXv_7Gkg",
  authDomain: "good-vibes-8a13d.firebaseapp.com",
  databaseURL: "https://good-vibes-8a13d-default-rtdb.firebaseio.com",
  projectId: "good-vibes-8a13d",
  storageBucket: "good-vibes-8a13d.firebasestorage.app",
  messagingSenderId: "310185051492",
  appId: "1:310185051492:web:c47435ce7842af9386e671",
  measurementId: "G-215VPTXGN8"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// === Referências aos elementos HTML ===
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const authContainer = document.getElementById('auth-container');

// Referências dos layouts e menu
const receitasLayout = document.getElementById('receitas-layout');
const createPostLayout = document.getElementById('create-post-layout');
const profileLayout = document.getElementById('profile-layout');
const sideMenu = document.getElementById('side-menu');

// Botões do menu
const menuToggleBtns = document.querySelectorAll('.menu-toggle-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const showFeedBtn = document.getElementById('show-feed-btn');
const showCreatePostBtn = document.getElementById('show-create-post-btn');
const showProfileBtn = document.getElementById('show-profile-btn');
const logoutBtnMenu = document.getElementById('logout-btn-menu');

// Elementos do feed
const postsFeed = document.getElementById('posts-feed');
const postTextarea = document.getElementById('post-text');
const postLinkInput = document.getElementById('post-link');
const linkPreviewContainer = document.getElementById('link-preview-container');
const publishPostBtn = document.getElementById('publish-post-btn');

// Elementos de perfil
const profilePhoto = document.getElementById('profile-photo');
const profileName = document.getElementById('profile-name');
const myPostsContainer = document.getElementById('my-posts-container');
const editProfileBtn = document.getElementById('edit-profile-btn');


// === Lógica de Autenticação e Layout de Login/Cadastro ===

auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuário logado: esconde o formulário de login e mostra o feed
        if (authContainer) authContainer.classList.add('hidden');
        if (receitasLayout) receitasLayout.classList.remove('hidden');
        if (createPostLayout) createPostLayout.classList.add('hidden');
        if (profileLayout) profileLayout.classList.add('hidden');
        
        const userName = document.getElementById('user-name');
        const userPhoto = document.getElementById('user-photo');
        const menuUserName = document.getElementById('menu-user-name');
        const menuUserPhoto = document.getElementById('menu-user-photo');
        const userNameCreate = document.getElementById('user-name-create');
        const userPhotoCreate = document.getElementById('user-photo-create');
        const userNameProfile = document.getElementById('user-name-profile');
        const userPhotoProfile = document.getElementById('user-photo-profile');

        if (userName) userName.textContent = user.displayName || 'Usuário';
        if (userPhoto) userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
        if (menuUserName) menuUserName.textContent = user.displayName || 'Usuário';
        if (menuUserPhoto) menuUserPhoto.src = user.photoURL || 'https://via.placeholder.com/80';
        if (userNameCreate) userNameCreate.textContent = user.displayName || 'Usuário';
        if (userPhotoCreate) userPhotoCreate.src = user.photoURL || 'https://via.placeholder.com/40';
        if (userNameProfile) userNameProfile.textContent = user.displayName || 'Usuário';
        if (userPhotoProfile) userPhotoProfile.src = user.photoURL || 'https://via.placeholder.com/40';

        loadPosts();
    } else {
        // Usuário deslogado: mostra o formulário de login e esconde os outros layouts
        if (authContainer) authContainer.classList.remove('hidden');
        if (receitasLayout) receitasLayout.classList.add('hidden');
        if (createPostLayout) createPostLayout.classList.add('hidden');
        if (profileLayout) profileLayout.classList.add('hidden');
    }
});


if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (registerForm) registerForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
    });
}

const registerUsername = document.getElementById('register-username');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerPhotoUrl = document.getElementById('register-photo-url');
const registerBtn = document.getElementById('register-btn');
const registerToggle = document.getElementById('register-toggle');

if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        const email = registerEmail.value;
        const password = registerPassword.value;
        const username = registerUsername.value;
        const photoUrl = registerPhotoUrl.value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return user.updateProfile({
                    displayName: username,
                    photoURL: photoUrl
                });
            })
            .then(() => {
                alert("Conta criada e perfil atualizado com sucesso!");
            })
            .catch((error) => {
                alert(`Erro: ${error.message}`);
            });
    });
}

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginToggle = document.getElementById('login-toggle');

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = loginEmail.value;
        const password = loginPassword.value;

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert("Login bem-sucedido!");
            })
            .catch((error) => {
                alert(`Erro ao fazer login: ${error.message}`);
            });
    });
}

if (loginToggle) {
    loginToggle.addEventListener('click', () => {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);
        loginToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

if (registerToggle) {
    registerToggle.addEventListener('click', () => {
        const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        registerPassword.setAttribute('type', type);
        registerToggle.textContent = type === 'password' ? '👁️' : '🙈';
    });
}


// === Lógica do Menu ===
function toggleMenu() {
    if (sideMenu) {
        sideMenu.classList.toggle('hidden');
    }
}

if (menuToggleBtns.length > 0) {
    menuToggleBtns.forEach(btn => {
        btn.addEventListener('click', toggleMenu);
    });
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', toggleMenu);
}

if (showFeedBtn) {
    showFeedBtn.addEventListener('click', () => {
        if (receitasLayout) receitasLayout.classList.remove('hidden');
        if (createPostLayout) createPostLayout.classList.add('hidden');
        if (profileLayout) profileLayout.classList.add('hidden');
        toggleMenu();
        loadPosts();
    });
}

if (showCreatePostBtn) {
    showCreatePostBtn.addEventListener('click', () => {
        if (receitasLayout) receitasLayout.classList.add('hidden');
        if (createPostLayout) createPostLayout.classList.remove('hidden');
        if (profileLayout) profileLayout.classList.add('hidden');
        toggleMenu();
    });
}

if (showProfileBtn) {
    showProfileBtn.addEventListener('click', () => {
        if (receitasLayout) receitasLayout.classList.add('hidden');
        if (createPostLayout) createPostLayout.classList.add('hidden');
        if (profileLayout) profileLayout.classList.remove('hidden');
        toggleMenu();
        loadUserPosts();
    });
}

if (logoutBtnMenu) {
    logoutBtnMenu.addEventListener('click', () => {
        auth.signOut().then(() => {
            alert('Você foi desconectado.');
            window.location.reload(); 
        }).catch((error) => {
            alert('Erro ao sair: ' + error.message);
        });
    });
}

if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        alert('Funcionalidade de edição de perfil ainda não implementada.');
    });
}


// === Lógica para a criação e exibição de posts ===

function isImage(url) {
    return /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
}

function isYoutube(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
}

function getYoutubeId(url) {
    const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|v\/|embed\/|e\/)|youtu\.be\/)([^&?]+)/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
}

if (postLinkInput) {
    postLinkInput.addEventListener('input', () => {
        const link = postLinkInput.value;
        linkPreviewContainer.innerHTML = '';
        
        if (link) {
            linkPreviewContainer.classList.remove('hidden');
            if (isImage(link)) {
                linkPreviewContainer.innerHTML = `<img src="${link}" alt="Pré-visualização da imagem">`;
            } else if (isYoutube(link)) {
                const videoId = getYoutubeId(link);
                if (videoId) {
                    linkPreviewContainer.innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
                }
            } else {
                linkPreviewContainer.classList.add('hidden');
            }
        } else {
            linkPreviewContainer.classList.add('hidden');
        }
    });
}


function renderPost(post, container) {
    const postElement = document.createElement('div');
    postElement.classList.add('post');
    postElement.dataset.postId = post.id;
    
    let mediaHtml = '';
    if (post.link) {
        if (isImage(post.link)) {
            mediaHtml = `<img src="${post.link}" alt="Imagem do post">`;
        } else if (isYoutube(post.link)) {
            const videoId = getYoutubeId(post.link);
            if (videoId) {
                mediaHtml = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
            }
        }
    }

   let likeCount = post.likeCount || 0;
    let likedBy = post.likedBy || [];
    const currentUser = auth.currentUser;
    let isLiked = currentUser && likedBy.includes(currentUser.uid);
    let likeButtonClass = isLiked ? 'like-btn liked' : 'like-btn';

    postElement.innerHTML = `
        <div class="post-header">
            <img class="post-user-photo" src="${post.authorPhotoURL || 'https://via.placeholder.com/40'}" alt="Foto de perfil de ${post.authorName}">
            <span class="post-user-name">${post.authorName}</span>
        </div>
        <p class="post-text">${post.text}</p>
        ${mediaHtml}
        <div class="post-actions">
            <button class="${likeButtonClass}">Curtir (${likeCount})</button>
            <button class="comment-btn">Comentar</button>
            <button class="share-btn">Compartilhar</button>
        </div>
    `;

    const likeButton = postElement.querySelector('.like-btn');
    if (likeButton && currentUser) {
        likeButton.addEventListener('click', async () => {
            const postRef = db.collection('posts').doc(post.id);

            // Se o usuário já curtiu, remove a curtida
            if (isLiked) {
                likedBy = likedBy.filter(uid => uid !== currentUser.uid);
                likeCount--;
            } else {
                // Se o usuário não curtiu, adiciona a curtida
                likedBy.push(currentUser.uid);
                likeCount++;
            }

            await postRef.update({
                likedBy: likedBy,
                likeCount: likeCount
            });

            // Atualiza a interface do usuário localmente
            isLiked = !isLiked;
            likeButton.textContent = `Curtir (${likeCount})`;
            likeButton.classList.toggle('liked', isLiked);
        });
            
            // Recarrega os posts para atualizar a interface
            if (container === postsFeed) {
                loadPosts();
            } else if (container === myPostsContainer) {
                loadUserPosts();
            }
    }

    // Event listeners para os botões de comentar e compartilhar
    const commentButton = postElement.querySelector('.comment-btn');
    const shareButton = postElement.querySelector('.share-btn');
    
    // Implementação da funcionalidade de comentários (exibe um prompt para o exemplo)
    commentButton.addEventListener('click', () => {
        const commentText = prompt('Digite seu comentário:');
        if (commentText && commentText.trim() !== '') {
            // Lógica para salvar o comentário no Firestore
            db.collection("posts").doc(post.id).collection("comments").add({
                text: commentText,
                authorId: auth.currentUser.uid,
                authorName: auth.currentUser.displayName || 'Usuário',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("Comentário adicionado!");
                // Aqui você pode adicionar lógica para mostrar o comentário no DOM
            }).catch((error) => {
                alert("Erro ao adicionar comentário: " + error.message);
            });
        }
    });
    
    // Implementação da funcionalidade de compartilhamento
    shareButton.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'GOOD-VIBES Post',
                text: post.text,
                url: window.location.href // URL da página atual
            }).then(() => {
                console.log('Post compartilhado com sucesso!');
            }).catch((error) => {
                console.error('Erro ao compartilhar:', error);
            });
        } else {
            // Fallback para navegadores sem a API de compartilhamento
            alert('A funcionalidade de compartilhamento não está disponível neste navegador.');
        }
    });

    container.appendChild(postElement);
}

// Implementação básica para o botão Editar Perfil
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            const newName = prompt('Digite seu novo nome:', user.displayName);
            const newPhotoUrl = prompt('Digite o novo URL da sua foto:', user.photoURL);

            if (newName || newPhotoUrl) {
                user.updateProfile({
                    displayName: newName || user.displayName,
                    photoURL: newPhotoUrl || user.photoURL
                }).then(() => {
                    alert('Perfil atualizado com sucesso!');
                    // Atualiza a interface do usuário após a atualização
                    loadUserPosts(); 
                }).catch((error) => {
                    alert('Erro ao atualizar perfil: ' + error.message);
                });
            }
        }
    });
}

function loadPosts() {
    if (postsFeed) postsFeed.innerHTML = '';
    db.collection("posts").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            renderPost({ ...doc.data(), id: doc.id }, postsFeed);
        });
    });
}

function loadUserPosts() {
    const user = auth.currentUser;
    if (user && myPostsContainer) {
        profilePhoto.src = user.photoURL || 'https://via.placeholder.com/100';
        profileName.textContent = user.displayName || 'Usuário';
        myPostsContainer.innerHTML = '<h4>Suas postagens:</h4>';
        db.collection("posts").where("authorId", "==", user.uid).orderBy("timestamp", "desc").get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                renderPost({ ...doc.data(), id: doc.id }, myPostsContainer);
            });
        });
    }
}


if (publishPostBtn) {
    publishPostBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        const postText = postTextarea.value.trim();
        const postLink = postLinkInput.value.trim();

        if (!user) {
            alert("Você precisa estar logado para publicar.");
            return;
        }

        if (postText === '' && postLink === '') {
            alert("O post não pode estar vazio.");
            return;
        }
        
        db.collection("posts").add({
            text: postText,
            link: postLink,
            authorId: user.uid,
            authorName: user.displayName || 'Usuário',
            authorPhotoURL: user.photoURL || 'https://via.placeholder.com/40',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likeCount: 0,
            likedBy: []
        })
        .then(() => {
            alert("Post publicado com sucesso!");
            postTextarea.value = '';
            postLinkInput.value = '';
            linkPreviewContainer.innerHTML = '';
            linkPreviewContainer.classList.add('hidden');
            // Redireciona para o feed após a publicação
            if (receitasLayout) receitasLayout.classList.remove('hidden');
            if (createPostLayout) createPostLayout.classList.add('hidden');
            loadPosts();
        })
        .catch((error) => {
            alert("Erro ao publicar post: " + error.message);
        });
    });
            }
