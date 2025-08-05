import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, where, doc, updateDoc, FieldValue, orderBy } from "https://www.gstatic.com/firebasejs/9.9.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();
const auth = getAuth();
const db = getFirestore(app);

const body = document.querySelector('body');
const userLayout = document.getElementById('user-layout');
const profileLayout = document.getElementById('profile-layout');
const feedLayout = document.getElementById('feed-layout');
const newPostLayout = document.getElementById('new-post-layout');
const profileLink = document.getElementById('profile-link');
const homeLink = document.getElementById('home-link');
const menuToggleBtns = document.querySelectorAll('.menu-toggle-btn');
const createPostBtn = document.querySelector('.create-post-btn');
const closeNewPostBtn = document.querySelector('.close-new-post-btn');
const publishPostBtn = document.getElementById('publish-post-btn');
const postTextarea = document.getElementById('post-text');
const linkInput = document.getElementById('link-post');
const linkPreviewContainer = document.getElementById('link-preview-container');
const signOutBtn = document.getElementById('sign-out-btn');
const feedPostsWrapper = document.getElementById('feed-posts-wrapper');
const myPostsWrapper = document.getElementById('my-posts-wrapper');
const menuWrapper = document.getElementById('menu-wrapper');

let currentUser = null;

function toggleMenu() {
    menuWrapper.classList.toggle('active');
}

menuToggleBtns.forEach(btn => {
    btn.addEventListener('click', toggleMenu);
});

profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    userLayout.classList.remove('active');
    feedLayout.classList.remove('active');
    profileLayout.classList.add('active');
    profileLink.classList.add('active');
    homeLink.classList.remove('active');
    toggleMenu();
    loadMyPosts();
});

homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    userLayout.classList.remove('active');
    profileLayout.classList.remove('active');
    feedLayout.classList.add('active');
    homeLink.classList.add('active');
    profileLink.classList.remove('active');
    toggleMenu();
});

createPostBtn.addEventListener('click', () => {
    newPostLayout.classList.add('active');
});

closeNewPostBtn.addEventListener('click', () => {
    newPostLayout.classList.remove('active');
    postTextarea.value = '';
    linkInput.value = '';
    linkPreviewContainer.innerHTML = '';
});

signOutBtn.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        body.classList.add('logged');
        userLayout.classList.add('active');
        feedLayout.classList.add('active');
        updateUserInfo(user);
        loadFeedPosts();
    } else {
        currentUser = null;
        body.classList.remove('logged');
        userLayout.classList.remove('active');
        profileLayout.classList.remove('active');
        feedLayout.classList.remove('active');
        newPostLayout.classList.remove('active');
    }
});

function updateUserInfo(user) {
    document.querySelector('.user-name').textContent = user.displayName;
    document.querySelector('.user-img').src = user.photoURL;
    document.querySelector('.user-bio').textContent = 'Seja a vibe que você deseja atrair.';
    document.querySelector('.profile-name').textContent = user.displayName;
    document.querySelector('.profile-img').src = user.photoURL;
    document.querySelector('.profile-bio').textContent = 'Seja a vibe que você deseja atrair.';
}

document.getElementById('theme-btn').addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
    }
});

// Funções auxiliares para validação de links
const isImage = (url) => {
    return url.match(/\.(jpeg|jpg|gif|png)$/i) != null;
};

const isYoutube = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
};

const getYoutubeId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
    const match = url.match(regex);
    return (match && match[1]) ? match[1] : null;
};

linkInput.addEventListener('input', () => {
    const url = linkInput.value;
    linkPreviewContainer.innerHTML = '';
    if (url) {
        if (isImage(url)) {
            linkPreviewContainer.innerHTML = `<img src="${url}" alt="Imagem do post">`;
        } else if (isYoutube(url)) {
            const videoId = getYoutubeId(url);
            if (videoId) {
                linkPreviewContainer.innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            }
        }
    }
});

publishPostBtn.addEventListener('click', async () => {
    if (postTextarea.value.trim() === '' && linkInput.value.trim() === '') {
        alert('O post não pode estar vazio.');
        return;
    }

    try {
        await addDoc(collection(db, 'posts'), {
            author: currentUser.displayName,
            authorId: currentUser.uid,
            authorPhoto: currentUser.photoURL,
            text: postTextarea.value,
            link: linkInput.value,
            timestamp: FieldValue.serverTimestamp(),
            likedBy: [],
            likeCount: 0
        });
        postTextarea.value = '';
        linkInput.value = '';
        linkPreviewContainer.innerHTML = '';
        newPostLayout.classList.remove('active');
    } catch (error) {
        console.error("Erro ao adicionar documento: ", error);
    }
});

function renderPost(post, container) {
    const postElement = document.createElement('div');
    postElement.classList.add('post');
    postElement.dataset.postId = post.id;

    const likedByMe = post.likedBy.includes(currentUser.uid);
    const likeBtnClass = likedByMe ? 'like-btn active' : 'like-btn';

    let mediaContent = '';
    if (post.link) {
        if (isImage(post.link)) {
            mediaContent = `<img src="${post.link}" alt="Imagem do post">`;
        } else if (isYoutube(post.link)) {
            const videoId = getYoutubeId(post.link);
            if (videoId) {
                mediaContent = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            }
        }
    }

    postElement.innerHTML = `
        <div class="post-header">
            <img class="post-author-img" src="${post.authorPhoto}" alt="Foto do autor">
            <span class="post-author">${post.author}</span>
        </div>
        <div class="post-content">
            <p>${post.text}</p>
            <div class="post-media-container">
                ${mediaContent}
            </div>
        </div>
        <div class="post-footer">
            <button class="${likeBtnClass}">
                <img src="./assets/heart.svg" alt="Curtir">
            </button>
            <span class="like-count">${post.likeCount}</span>
        </div>
    `;

    const likeBtn = postElement.querySelector('.like-btn');
    likeBtn.addEventListener('click', async () => {
        const postId = postElement.dataset.postId;
        const postRef = doc(db, 'posts', postId);

        if (likedByMe) {
            await updateDoc(postRef, {
                likedBy: FieldValue.arrayRemove(currentUser.uid),
                likeCount: FieldValue.increment(-1)
            });
        } else {
            await updateDoc(postRef, {
                likedBy: FieldValue.arrayUnion(currentUser.uid),
                likeCount: FieldValue.increment(1)
            });
        }
    });

    container.prepend(postElement);
}

function loadFeedPosts() {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        feedPostsWrapper.querySelector('.posts-content').innerHTML = '';
        snapshot.forEach((doc) => {
            renderPost({ ...doc.data(), id: doc.id }, feedPostsWrapper.querySelector('.posts-content'));
        });
    });
}

function loadMyPosts() {
    if (!currentUser) return;
    const q = query(collection(db, 'posts'), where('authorId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
    onSnapshot(q, (snapshot) => {
        myPostsWrapper.querySelector('.posts-content').innerHTML = '';
        snapshot.forEach((doc) => {
            renderPost({ ...doc.data(), id: doc.id }, myPostsWrapper.querySelector('.posts-content'));
        });
    });
}