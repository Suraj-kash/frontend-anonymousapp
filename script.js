const API_URL = "http://127.0.0.1:8000"; // Backend URL
const socket = new WebSocket("ws://127.0.0.1:8000/ws");

const userLikes = new Set(); // Stores liked view IDs

// WebSocket - Listen for real-time updates
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.event === "new_view") {
        addViewToDOM(data.data);
    } else if (data.event === "new_comment") {
        appendCommentToDOM(data.data.view_id, data.data.comment);
    }
};

// Post a new view
async function postView(event) {
    event.preventDefault(); // Prevent page reload

    const text = document.getElementById("text").value;
    const media = document.getElementById("media").files[0];

    if (!text) {
        alert("Please write something!");
        return;
    }

    const formData = new FormData();
    formData.append("text", text);
    if (media) formData.append("file", media);

    try {
        const response = await fetch(`${API_URL}/submit`, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            alert("View posted successfully!");
            document.getElementById("viewForm").reset();
            fetchViews(); // Refresh views list
        } else {
            const result = await response.json();
            alert(result.detail);
        }
    } catch (error) {
        console.error("Error posting view:", error);
    }
}

// Fetch and display views
async function fetchViews() {
    try {
        const response = await fetch(`${API_URL}/views?page=1&page_size=10`);
        const data = await response.json();
        const viewsContainer = document.getElementById("viewsContainer");
        viewsContainer.innerHTML = ""; // Clear previous views

        data.views.forEach(view => addViewToDOM(view));
    } catch (error) {
        console.error("Error fetching views:", error);
    }
}

// Render a view in the DOM
function addViewToDOM(view) {
    const viewsContainer = document.getElementById("viewsContainer");
    const viewElement = document.createElement("div");
    viewElement.classList.add("view");

    let mediaHtml = "";
    if (view.media_url) {
        if (view.media_url.endsWith(".mp4") || view.media_url.endsWith(".webm")) {
            mediaHtml = `<video src="${API_URL}${view.media_url}" controls width="300"></video>`;
        } else {
            mediaHtml = `<img src="${API_URL}${view.media_url}" width="300" />`;
        }
    }

    viewElement.innerHTML = `
        <p>${view.text}</p>
        ${mediaHtml}
        <p>👍 <span id="upvotes-${view._id}">${view.upvotes}</span> 
        <button id="like-btn-${view._id}" onclick="toggleLike('${view._id}')">
            ${userLikes.has(view._id) ? "Unlike" : "Like"}
        </button></p>
        
        <h4>Comments</h4>
        <div id="comments-${view._id}"></div>
        <input type="text" id="comment-text-${view._id}" placeholder="Add a comment">
        <button onclick="addComment('${view._id}')">Comment</button>
    `;

    viewsContainer.prepend(viewElement); // Add to top of list
}

// Toggle Like (Upvote/Remove Upvote)
async function toggleLike(viewId) {
    const likeBtn = document.getElementById(`like-btn-${viewId}`);
    const upvoteCount = document.getElementById(`upvotes-${viewId}`);

    try {
        if (userLikes.has(viewId)) {
            // Unlike (Decrease count)
            await fetch(`${API_URL}/downvote/${viewId}`, { method: "POST" });
            userLikes.delete(viewId);
            upvoteCount.innerText = Math.max(0, parseInt(upvoteCount.innerText) - 1);
            likeBtn.innerText = "Like";
        } else {
            // Like (Increase count)
            await fetch(`${API_URL}/upvote/${viewId}`, { method: "POST" });
            userLikes.add(viewId);
            upvoteCount.innerText = parseInt(upvoteCount.innerText) + 1;
            likeBtn.innerText = "Unlike";
        }
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}

// Add a comment
async function addComment(viewId) {
    const commentText = document.getElementById(`comment-text-${viewId}`).value;
    if (!commentText) return alert("Comment cannot be empty!");

    try {
        const response = await fetch(`${API_URL}/comment/${viewId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: commentText }),
        });

        const result = await response.json();
        if (response.ok) {
            appendCommentToDOM(viewId, { text: commentText, timestamp: new Date().toISOString() });
            document.getElementById(`comment-text-${viewId}`).value = ""; // Clear input
        } else {
            alert(result.detail);
        }
    } catch (error) {
        console.error("Error adding comment:", error);
    }
}

// Append a new comment to the DOM
function appendCommentToDOM(viewId, comment) {
    const commentsContainer = document.getElementById(`comments-${viewId}`);
    if (commentsContainer) {
        const commentElement = document.createElement("p");
        commentElement.innerHTML = `${comment.text} <i>(${new Date(comment.timestamp).toLocaleString()})</i>`;
        commentsContainer.appendChild(commentElement);
    }
}

// Load views on page load
fetchViews();
