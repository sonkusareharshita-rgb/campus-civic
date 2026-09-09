import { useState } from "react";
import "./App.css";

const LOCATIONS = [
  "Main Building",
  "Library",
  "Block A",
  "Block B",
  "Block C",
  "Computer Lab",
  "Canteen",
  "Auditorium",
  "Sports Ground",
  "Hostel Block",
  "Admin Office",
  "Parking Area",
  "Other",
];

const CATEGORIES = [
  { id: 1, name: "Electricity", emoji: "⚡" },
  { id: 2, name: "Water", emoji: "💧" },
  { id: 3, name: "Cleanliness", emoji: "🧹" },
  { id: 4, name: "Infrastructure", emoji: "🏗️" },
  { id: 5, name: "Wi-Fi / Internet", emoji: "📶" },
  { id: 6, name: "Security", emoji: "🔒" },
  { id: 7, name: "Other", emoji: "📌" },
];

function ReportIssue({ user, onBack, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [categoryId, setCategoryId] = useState(null);

  const [visibility, setVisibility] = useState("PUBLIC");

  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  // ==========================================
  // PHOTO CHANGE
  // ==========================================

  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];

    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    setError(null);
    setImage(selectedImage);
  };


  // ==========================================
  // VIDEO CHANGE + 2 MINUTE VALIDATION
  // ==========================================

  const handleVideoChange = (e) => {
    const selectedVideo = e.target.files[0];

    if (!selectedVideo) return;

    if (!selectedVideo.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      e.target.value = "";
      return;
    }

    const videoElement = document.createElement("video");

    videoElement.preload = "metadata";

    videoElement.onloadedmetadata = () => {
      URL.revokeObjectURL(videoElement.src);

      if (videoElement.duration > 120) {
        setError("Video must not be longer than 2 minutes.");
        setVideo(null);
        e.target.value = "";
        return;
      }

      setError(null);
      setVideo(selectedVideo);
    };

    videoElement.onerror = () => {
      setError("Unable to read this video file.");
      e.target.value = "";
    };

    videoElement.src = URL.createObjectURL(selectedVideo);
  };


  // ==========================================
  // SUBMIT ISSUE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !location || !categoryId) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullLocation = extraDetail
        ? `${location} — ${extraDetail}`
        : location;


      // ==========================================
      // FORMDATA FOR TEXT + IMAGE + VIDEO
      // ==========================================

      const formData = new FormData();

      formData.append(
        "reported_by",
        user.user_id
      );

      formData.append(
        "category_id",
        categoryId
      );

      formData.append(
        "title",
        title
      );

      formData.append(
        "description",
        description
      );

      formData.append(
        "location",
        fullLocation
      );

      formData.append(
        "visibility",
        visibility
      );

      formData.append(
        "priority",
        "MEDIUM"
      );

      formData.append(
        "force_create",
        "false"
      );


      // PHOTO

      if (image) {
        formData.append(
          "image",
          image
        );
      }


      // VIDEO

      if (video) {
        formData.append(
          "video",
          video
        );
      }


      // ==========================================
      // API CALL
      // ==========================================

      const res = await fetch(
        "http://localhost:5000/api/issues",
        {
          method: "POST",
          body: formData,
        }
      );


      const data = await res.json();


      // ==========================================
      // DUPLICATE ISSUE
      // ==========================================

      if (
        res.status === 409 &&
        data.duplicate
      ) {

        const confirmCreate =
          window.confirm(
            `A similar issue already exists:\n\n"${data.existing_issue.title}"\n\nDo you still want to create a new report?`
          );


        if (!confirmCreate) {
          setLoading(false);
          return;
        }


        // CREATE NEW FORCED REPORT

        formData.set(
          "force_create",
          "true"
        );


        const res2 = await fetch(
          "http://localhost:5000/api/issues",
          {
            method: "POST",
            body: formData,
          }
        );


        const data2 =
          await res2.json();


        if (!res2.ok) {
          throw new Error(
            data2.message ||
            "Failed to submit issue"
          );
        }


        alert(
          "Issue submitted successfully!"
        );


        onSuccess?.();

        return;
      }


      // ==========================================
      // ERROR
      // ==========================================

      if (!res.ok) {

        throw new Error(
          data.message ||
          "Failed to submit issue"
        );

      }


      // ==========================================
      // SUCCESS
      // ==========================================

      alert(
        "Issue submitted successfully!"
      );


      onSuccess?.();


    } catch (err) {

      console.error(
        "Submit issue error:",
        err
      );

      setError(
        err.message ||
        "Something went wrong. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================
  // UI
  // ==========================================

  return (

    <div className="report-sheet">


      {/* HEADER */}

      <div className="report-sheet-header">

        <button
          type="button"
          className="report-sheet-back"
          onClick={onBack}
          aria-label="Cancel"
        >
          ✕
        </button>


        <h2 className="report-sheet-title">
          Report an Issue
        </h2>


        <button
          type="button"
          className="report-sheet-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "..." : "Post"}
        </button>

      </div>


      <form
        className="report-sheet-form"
        onSubmit={handleSubmit}
      >


        {/* ERROR */}

        {error && (

          <div className="report-error">
            {error}
          </div>

        )}


        {/* ==========================================
            VISIBILITY
        ========================================== */}

        <div className="report-field">

          <label className="report-label">
            Post Visibility *
          </label>


          <p className="report-field-hint">
            Choose who can view your complaint.
          </p>


          <div className="visibility-options">


            {/* PUBLIC */}

            <button
              type="button"
              className={`visibility-option ${
                visibility === "PUBLIC"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setVisibility("PUBLIC")
              }
            >

              <div className="visibility-icon">
                🌐
              </div>


              <div className="visibility-text">

                <strong>
                  Public
                </strong>

                <small>
                  Visible to everyone on Campus Civic
                </small>

              </div>


              <div className="visibility-check">

                {visibility === "PUBLIC"
                  ? "✓"
                  : ""}

              </div>

            </button>


            {/* PRIVATE */}

            <button
              type="button"
              className={`visibility-option ${
                visibility === "PRIVATE"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setVisibility("PRIVATE")
              }
            >

              <div className="visibility-icon">
                🔒
              </div>


              <div className="visibility-text">

                <strong>
                  Private
                </strong>

                <small>
                  Visible only to authorized administrators
                </small>

              </div>


              <div className="visibility-check">

                {visibility === "PRIVATE"
                  ? "✓"
                  : ""}

              </div>

            </button>

          </div>

        </div>


        {/* ==========================================
            CATEGORY
        ========================================== */}

        <div className="report-field">

          <label className="report-label">
            Category *
          </label>


          <div className="report-category-grid">

            {CATEGORIES.map((cat) => (

              <button
                key={cat.id}
                type="button"
                className={`report-cat-btn ${
                  categoryId === cat.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setCategoryId(cat.id)
                }
              >

                <span>
                  {cat.emoji}
                </span>

                <small>
                  {cat.name}
                </small>

              </button>

            ))}

          </div>

        </div>


        {/* TITLE */}

        <div className="report-field">

          <label className="report-label">
            Title *
          </label>


          <input
            className="report-input"
            type="text"
            placeholder="e.g. Broken fan in Room 204"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            maxLength={100}
            required
          />

        </div>


        {/* DESCRIPTION */}

        <div className="report-field">

          <label className="report-label">
            Description *
          </label>


          <textarea
            className="report-textarea"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={4}
            required
          />

        </div>


        {/* LOCATION */}

        <div className="report-field">

          <label className="report-label">
            Location *
          </label>


          <select
            className="report-select"
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
            required
          >

            <option value="">
              Select location…
            </option>


            {LOCATIONS.map((loc) => (

              <option
                key={loc}
                value={loc}
              >
                {loc}
              </option>

            ))}

          </select>

        </div>


        {/* EXTRA DETAIL */}

        {location && (

          <div className="report-field">

            <label className="report-label">
              Room / Floor / Extra Detail
            </label>


            <input
              className="report-input"
              type="text"
              placeholder="e.g. Room 204, 3rd floor"
              value={extraDetail}
              onChange={(e) =>
                setExtraDetail(e.target.value)
              }
            />

          </div>

        )}


        {/* ==========================================
            PHOTO UPLOAD
        ========================================== */}

        <div className="report-field">

          <label className="report-label">
            📷 Photo Proof (Optional)
          </label>


          <label className="report-photo-area">

            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />


            <span className="report-photo-icon">
              📷
            </span>


            <span>

              {image
                ? image.name
                : "Tap to add a photo"}

            </span>

          </label>

        </div>


        {/* ==========================================
            VIDEO UPLOAD
        ========================================== */}

        <div className="report-field">

          <label className="report-label">
            📹 Video Proof (Optional)
          </label>


          <label className="report-photo-area">

            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              style={{ display: "none" }}
              onChange={handleVideoChange}
            />


            <span className="report-photo-icon">
              📹
            </span>


            <span>

              {video
                ? video.name
                : "Tap to add a video"}

            </span>

          </label>


          <small className="upload-help-text">
            Maximum video duration: 2 minutes
          </small>

        </div>


        {/* SUBMIT */}

        <button
          type="submit"
          className="report-submit-full"
          disabled={loading}
        >

          {loading
            ? "Submitting..."
            : "Submit Issue"}

        </button>


      </form>

    </div>

  );
}

export default ReportIssue;