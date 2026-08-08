import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Camera, Upload, Eye, Video, Star, MessageSquare, Trash2 } from "lucide-react";
import { getCountryFlag, getLanguageLabel, INTERESTS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import VideoRecorderModal from "@/components/profile/VideoRecorderModal";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const role = user?.role;

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      if (role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
        }
      } else {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      if (role === "tutor") {
        const updates = { display_name: profile.display_name, bio: profile.bio, interests: profile.interests || [] };
        await base44.functions.invoke('updateMyProfile', { updates });
      } else {
        await base44.functions.invoke('updateMyProfile', { updates: { full_name: profile.full_name } });
        await base44.auth.updateMe({ full_name: profile.full_name });
      }
      toast({ title: "Profile saved! ✅" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('updateMyProfile', { updates: { photo_url: file_url } });
      setProfile({ ...profile, photo_url: file_url });
      toast({ title: "Photo updated! 📸" });
    } catch { toast({ title: "Error uploading photo", variant: "destructive" }); } finally { setUploadingPhoto(false); }
  };

  const handleVideoUpload = async (file) => {
    if (!file || !profile) return;
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('updateMyProfile', { updates: { intro_video_url: file_url } });
      setProfile({ ...profile, intro_video_url: file_url });
      toast({ title: "Intro video updated! 🎥" });
    } catch { toast({ title: "Error uploading video", variant: "destructive" }); } finally { setUploadingVideo(false); }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Remove your profile photo?")) return;
    setUploadingPhoto(true);
    try {
      await base44.functions.invoke('updateMyProfile', { updates: { photo_url: "" } });
      setProfile({ ...profile, photo_url: "" });
      toast({ title: "Photo removed" });
    } catch { toast({ title: "Error removing photo", variant: "destructive" }); }
    finally { setUploadingPhoto(false); }
  };

  const handleRemoveVideo = async () => {
    if (!confirm("Remove your intro video?")) return;
    setUploadingVideo(true);
    try {
      await base44.functions.invoke('updateMyProfile', { updates: { intro_video_url: "" } });
      setProfile({ ...profile, intro_video_url: "" });
      toast({ title: "Video removed" });
    } catch { toast({ title: "Error removing video", variant: "destructive" }); }
    finally { setUploadingVideo(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  // For non-tutors, render simple profile
  if (role !== "tutor") {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Profile</h1>
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="theme-heading font-display font-bold text-white">{profile?.full_name}</p>
              <p className="theme-subtext text-sm text-gray-500 capitalize">{role}</p>
            </div>
          </div>
          <div>
            <Label className="theme-subtext text-gray-500 text-sm">Full name</Label>
            <Input
              value={profile?.full_name || ""}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-orange-500/50"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-6">My Profile</h1>

      {/* Public Profile */}
      <div className="space-y-4">

          {/* Profile preview card */}
          <div className="rounded-3xl border border-white/20 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-bold text-white">This is how your profile looks to students</p>
            </div>

            {/* Exact replica of TutorCard */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <img
                    src={profile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "T")}&background=F26A1B&color=fff&size=80`}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                  {profile?.is_available_now ? (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-slate-950 rounded-full">
                      <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
                    </div>
                  ) : (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-500 border-2 border-slate-950 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-white truncate">{profile?.display_name || profile?.full_name || "Your name"}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <span className="text-lg leading-none">{getCountryFlag(profile?.nationality || profile?.country)}</span>
                    <span>{profile?.nationality || profile?.country || "Your country"}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {(profile?.total_reviews || 0) > 0 ? (profile?.average_rating || 0).toFixed(1) : "New"}
                    </span>
                    <span className="text-xs text-gray-600">{profile?.total_lessons || 0} lessons</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {profile?.is_available_now ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">● Online</span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/5 border border-white/10 text-gray-500">Offline</span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profile?.native_languages?.map(l => (
                  <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium">
                    {getLanguageLabel(l)}
                  </span>
                ))}
                {profile?.interests?.slice(0, 3).map(i => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-500">{i}</span>
                ))}
              </div>
              {profile?.is_available_now && (
                <div className="mt-3 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available now
                </div>
              )}
            </div>

            {/* Tips below the card */}
            <div className="mt-4 space-y-2 text-xs text-gray-300">
              <p>📸 <strong className="text-white">Profile photo:</strong> Always add a photo in a well-lit environment — students trust tutors they can see clearly.</p>
              <p>✍️ <strong className="text-white">Bio:</strong> Write a short introduction about yourself, your teaching style and experience.</p>
              <p>🎥 <strong className="text-white">Intro video:</strong> Record a video of up to 2 minutes introducing yourself — this greatly increases your bookings!</p>
            </div>
          </div>

          {/* Conversation Topics card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-orange-400" />
                <Label className="theme-subtext text-gray-500 text-sm block">Conversation topics</Label>
              </div>
              <p className="text-xs text-orange-400 mb-3">
                🗣️ Select the topics you enjoy discussing. These appear on your public profile and help students find you.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(topic => {
                  const selected = (profile?.interests || []).includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        const current = profile?.interests || [];
                        const updated = selected
                          ? current.filter(i => i !== topic)
                          : [...current, topic];
                        setProfile({ ...profile, interests: updated });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white/5 text-gray-400 border-white/10 hover:border-orange-400 hover:text-orange-400"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Photo card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-orange-400" />
              <p className="text-sm font-semibold text-orange-400">This information is visible to students on the platform</p>
            </div>

            {/* Nome público */}
            <div className="mb-5">
              <Label className="theme-subtext text-gray-500 text-sm block mb-1">Public name</Label>
              <p className="text-xs text-orange-400 mb-2">👤 This is the name students will see on your card and profile. It can be your first name, nickname or whatever you prefer to be called.</p>
              <Input
                value={profile?.display_name || ""}
                onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="e.g. Helena, Prof. Carlos, Teacher Ana... (leave empty to use your legal name)"
                className="theme-input bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
              />
            </div>

            <Label className="theme-subtext text-gray-500 text-sm block mb-3">Profile photo</Label>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <img
                  src={profile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "T")}&background=F26A1B&color=fff&size=80`}
                  alt="Profile photo"
                  className="w-24 h-24 rounded-2xl object-cover ring-2 ring-orange-500/30"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {/* Galeria */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ""; }}
                />
                {/* Câmera — capture="user" abre câmera frontal no mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handlePhotoUpload(e.target.files[0]); e.target.value = ""; }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fileInputRef.current.value = ""; fileInputRef.current.click(); }}
                  disabled={uploadingPhoto}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload from gallery
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { cameraInputRef.current.value = ""; cameraInputRef.current.click(); }}
                  disabled={uploadingPhoto}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start"
                >
                  <Camera className="w-4 h-4 mr-2" /> Take photo now
                </Button>
                {profile?.photo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="theme-btn-ghost border-red-500/20 text-red-400 hover:text-red-300 justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remove photo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Intro video card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Video className="w-4 h-4 text-orange-400" />
              <Label className="theme-subtext text-gray-500 text-sm">Intro video</Label>
            </div>
            <p className="text-xs text-orange-400">🎥 A short intro video helps students connect with you before booking a lesson. Keep it under 2 minutes!</p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => { if (e.target.files[0]) handleVideoUpload(e.target.files[0]); e.target.value = ""; }}
            />
            {profile?.intro_video_url ? (
              <div className="space-y-3">
                <video src={profile.intro_video_url} controls className="w-full rounded-xl bg-black" style={{ maxHeight: 220 }} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current.click()}
                    disabled={uploadingVideo}
                    className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" /> {uploadingVideo ? "Uploading..." : "Replace video"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRecorder(true)}
                    disabled={uploadingVideo}
                    className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start flex-1"
                  >
                    <Video className="w-4 h-4 mr-2" /> Record video
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveVideo}
                    disabled={uploadingVideo}
                    className="theme-btn-ghost border-red-500/20 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current.click()}
                  disabled={uploadingVideo}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" /> {uploadingVideo ? "Uploading..." : "Upload intro video"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecorder(true)}
                  disabled={uploadingVideo}
                  className="theme-btn-ghost border-white/10 text-gray-400 hover:text-white justify-start flex-1"
                >
                  <Video className="w-4 h-4 mr-2" /> Record video
                </Button>
              </div>
            )}
          </div>

          {showRecorder && (
            <VideoRecorderModal
              onSave={(file) => { setShowRecorder(false); handleVideoUpload(file); }}
              onClose={() => setShowRecorder(false)}
            />
          )}

          {/* Bio card */}
          <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <Label className="theme-subtext text-gray-500 text-sm block mb-1">Bio — Introduction for students</Label>
              <p className="text-xs text-orange-400 mb-3">
                ✨ Write a brief introduction about yourself: your experience, teaching style and what students can expect from your lessons. This text will appear on your public profile.
              </p>
              <Textarea
                value={profile?.bio || ""}
                onChange={e => setProfile({ ...profile, bio: e.target.value.slice(0, 300) })}
                placeholder="e.g. Hi! I'm an English teacher with 5 years of experience. Specialised in conversation and pronunciation for beginners and intermediate learners..."
                className="theme-input h-32 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
              />
              <p className="theme-subtext text-xs text-gray-500 mt-1 text-right">{(profile?.bio || "").length}/300 characters</p>
            </div>

            <Button onClick={handleSave} disabled={saving}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save public profile"}
            </Button>
          </div>
        </div>
    </div>
  );
}