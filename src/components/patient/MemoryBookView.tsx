import React, { useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  User,
  Users,
  Clock,
  MapPin,
  AlertCircle,
  Phone,
  Cake,
  Sparkles,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { familyPhoto } from '../../services/storage';

export const MemoryBookView: React.FC = () => {
  const { db, updateMemoryBook, speakText } = useMedha();
  const [pageIndex, setPageIndex] = useState(0);
  const [editingPage, setEditingPage] = useState<string | null>(null);

  // Local state for editing fields
  const [bookData, setBookData] = useState(() => JSON.parse(JSON.stringify(db.book)));

  const handleNext = () => {
    if (pageIndex < 5) {
      setPageIndex((p) => p + 1);
      speakText('Next page');
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    }
  };

  const handleSaveEdit = () => {
    updateMemoryBook(() => bookData);
    setEditingPage(null);
  };

  const totalPages = 5;

  return (
    <section id="page-book" className="page active space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0E7C66]" />
            <h2 className="font-display text-2xl font-bold ink">My Memory Book</h2>
          </div>
          <p className="muted text-sm mt-0.5 flex items-center gap-1.5">
            <span>Tap pages to turn</span>
            <span>·</span>
            <Pencil className="w-3 h-3 text-[#0E7C66]" />
            <span>edit anytime · saves automatically</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="bookPrev"
            onClick={handlePrev}
            disabled={pageIndex === 0}
            className={`w-11 h-11 rounded-xl card font-bold flex items-center justify-center cursor-pointer transition ${
              pageIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#F6F9F7]'
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-[#0E7C66]" />
          </button>
          <span id="bookPageNum" className="text-xs font-bold muted min-w-20 text-center px-2 py-1 bg-white rounded-lg border border-[#E5DEC9]">
            {pageIndex === 0 ? 'Cover' : `Page ${pageIndex} of ${totalPages}`}
          </span>
          <button
            id="bookNext"
            onClick={handleNext}
            disabled={pageIndex === totalPages}
            className={`w-11 h-11 rounded-xl card font-bold flex items-center justify-center cursor-pointer transition ${
              pageIndex === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#F6F9F7]'
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-[#0E7C66]" />
          </button>
        </div>
      </div>

      {/* Book Stage */}
      <div className="book-stage mx-auto relative" style={{ maxWidth: '640px', minHeight: '520px' }}>
        <div
          id="bookShadow"
          className="absolute inset-x-6 -bottom-3 h-8 rounded-[100%] blur-md"
          style={{ background: 'rgba(43,35,32,.18)' }}
        />

        <div
          className="relative w-full rounded-2xl overflow-hidden card memory-book-shell min-h-[500px] flex flex-col justify-between shadow-sm"
          style={{ border: '1px solid #e6d5bc' }}
        >
          {/* Page 0: Cover */}
          {pageIndex === 0 && (
            <div
              className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 relative"
              style={{ background: 'linear-gradient(150deg,#0A5C4C,#0E7C66)' }}
            >
              <div className="weave w-24 h-2 rounded-full" />
              <div className="w-20 h-20 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center text-white mt-6 shadow-inner">
                <BookOpen className="w-10 h-10" />
              </div>
              <p className="font-display text-3xl font-bold text-white mt-4">My Memory Book</p>
              <p className="text-[#F2C063] font-semibold mt-1">মোৰ স্মৃতি পুথি</p>
              <div className="weave w-24 h-2 rounded-full mt-6" />
              <p className="text-white/75 text-xs mt-8">
                Belongs to <span className="font-bold text-white underline decoration-[#F2C063]">{bookData.profile.name}</span>
              </p>
            </div>
          )}

          {/* Page 1: Profile */}
          {pageIndex === 1 && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0E7C66]" />
                  <h3 className="font-display text-xl font-bold ink">About Me</h3>
                </div>
                <button
                  onClick={() => {
                    if (editingPage === 'profile') handleSaveEdit();
                    else setEditingPage('profile');
                  }}
                  className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                  style={{ background: editingPage === 'profile' ? '#EDF6F2' : '' }}
                >
                  {editingPage === 'profile' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>
              <div className="weave h-1 rounded-full my-3 opacity-70" />
              <dl className="space-y-3.5 mt-2 text-sm overflow-auto max-h-[380px] pr-1">
                {[
                  ['Name', 'name'],
                  ['Age', 'age'],
                  ['Born', 'born'],
                  ['Home', 'home'],
                  ['Worked as', 'job'],
                  ['Languages', 'language'],
                  ['Favourite food', 'food'],
                  ['Favourite song', 'song'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider muted">{label}</dt>
                    {editingPage === 'profile' ? (
                      <input
                        value={bookData.profile[key] || ''}
                        onChange={(e) =>
                          setBookData({
                            ...bookData,
                            profile: { ...bookData.profile, [key]: e.target.value },
                          })
                        }
                        className="mt-1 w-full px-2 py-1 rounded border text-sm font-semibold ink bg-[#FFF8E8]"
                        style={{ borderColor: '#E3A63B' }}
                      />
                    ) : (
                      <dd className="text-base font-bold ink">{bookData.profile[key]}</dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Page 2: Family */}
          {pageIndex === 2 && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0E7C66]" />
                  <h3 className="font-display text-xl font-bold ink">My Family</h3>
                </div>
                <button
                  onClick={() => {
                    if (editingPage === 'family') handleSaveEdit();
                    else setEditingPage('family');
                  }}
                  className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                  style={{ background: editingPage === 'family' ? '#EDF6F2' : '' }}
                >
                  {editingPage === 'family' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>
              <div className="weave h-1 rounded-full my-3 opacity-70" />
              <div className="space-y-3 mt-2 overflow-auto max-h-[380px] pr-1">
                {bookData.family.map((f: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[#EFE2C8]" style={{ background: '#FBF4E6' }}>
                    <img
                      src={familyPhoto(f.photo)}
                      alt={`Portrait of ${f.n}`}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover family-portrait shrink-0 border-2 shadow-xs"
                      style={{ borderColor: '#EBD6A8' }}
                      onError={(e: any) => {
                        e.target.src = '/family-moloi.svg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{f.e}</span>
                        {editingPage === 'family' ? (
                          <input
                            value={f.n}
                            onChange={(e) => {
                              const updated = [...bookData.family];
                              updated[i].n = e.target.value;
                              setBookData({ ...bookData, family: updated });
                            }}
                            className="font-bold ink text-sm px-1 rounded bg-[#FFF8E8] border border-[#E3A63B]"
                          />
                        ) : (
                          <p className="font-bold ink text-sm">{f.n}</p>
                        )}
                      </div>
                      <p className="text-xs muted mt-0.5">
                        {f.r} · age {f.age}
                      </p>
                      <p className="text-xs muted mt-1 flex items-center gap-1">
                        <Cake className="w-3 h-3 text-amber-600" />
                        <span>{f.birthday}</span>
                      </p>
                      <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                        <Phone className="w-3 h-3 text-[#0E7C66]" />
                        <span>{f.p}</span>
                      </p>
                      <p className="text-xs mt-1.5 ink italic">“{f.memory}”</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page 3: Routine */}
          {pageIndex === 3 && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0E7C66]" />
                  <h3 className="font-display text-xl font-bold ink">My Day</h3>
                </div>
                <button
                  onClick={() => {
                    if (editingPage === 'routine') handleSaveEdit();
                    else setEditingPage('routine');
                  }}
                  className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                  style={{ background: editingPage === 'routine' ? '#EDF6F2' : '' }}
                >
                  {editingPage === 'routine' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>
              <div className="weave h-1 rounded-full my-3 opacity-70" />
              <div className="mt-2 space-y-0 overflow-auto max-h-[380px] pr-1">
                {bookData.routine.map((r: any, i: number) => (
                  <div
                    key={i}
                    className={`flex gap-3 py-3 ${i < bookData.routine.length - 1 ? 'border-b' : ''}`}
                    style={{ borderColor: '#EFE6D4' }}
                  >
                    <span className="text-xs font-extrabold w-16 shrink-0 pt-0.5" style={{ color: '#8A6210' }}>
                      {r.t}
                    </span>
                    {editingPage === 'routine' ? (
                      <input
                        value={r.a}
                        onChange={(e) => {
                          const updated = [...bookData.routine];
                          updated[i].a = e.target.value;
                          setBookData({ ...bookData, routine: updated });
                        }}
                        className="text-sm ink flex-1 px-2 py-1 rounded bg-[#FFF8E8] border border-[#E3A63B]"
                      />
                    ) : (
                      <span className="text-sm ink flex-1 font-medium">{r.a}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page 4: Places */}
          {pageIndex === 4 && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#0E7C66]" />
                  <h3 className="font-display text-xl font-bold ink">Places I Love</h3>
                </div>
                <button
                  onClick={() => {
                    if (editingPage === 'places') handleSaveEdit();
                    else setEditingPage('places');
                  }}
                  className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                  style={{ background: editingPage === 'places' ? '#EDF6F2' : '' }}
                >
                  {editingPage === 'places' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>
              <div className="weave h-1 rounded-full my-3 opacity-70" />
              <div className="grid grid-cols-2 gap-3 mt-2 overflow-auto max-h-[380px] pr-1">
                {bookData.places.map((p: any, i: number) => (
                  <div key={i} className="p-3.5 rounded-xl text-center border border-[#EFE2C8]" style={{ background: '#FBF4E6' }}>
                    <span className="text-4xl select-none">{p.e}</span>
                    <p className="font-bold text-sm ink mt-2">{p.n}</p>
                    <p className="text-xs muted mt-1">{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page 5: Help */}
          {pageIndex === 5 && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#C2452D]" />
                  <h3 className="font-display text-xl font-bold ink">Emergency &amp; Help</h3>
                </div>
                <button
                  onClick={() => {
                    if (editingPage === 'help') handleSaveEdit();
                    else setEditingPage('help');
                  }}
                  className="chip px-3 py-1.5 text-xs font-bold bg-white hover:bg-[#F6F9F7] cursor-pointer flex items-center gap-1.5"
                  style={{ background: editingPage === 'help' ? '#EDF6F2' : '' }}
                >
                  {editingPage === 'help' ? (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-[#0E7C66]" />
                      <span>Edit</span>
                    </>
                  )}
                </button>
              </div>
              <div className="weave h-1 rounded-full my-3 opacity-70" />
              <div className="mt-2 space-y-3 text-sm overflow-auto max-h-[380px] pr-1">
                <div className="p-3.5 rounded-xl border border-rose-200" style={{ background: '#FBEAE5' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C2452D]">
                    Doctor
                  </p>
                  <p className="font-bold ink text-base mt-0.5">{bookData.help.doc}</p>
                  <p className="text-sm ink mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-rose-600" />
                    <span>{bookData.help.docp}</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-200" style={{ background: '#EDF6F2' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0A5C4C]">
                    Address
                  </p>
                  <p className="ink text-base mt-0.5 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0E7C66]" />
                    <span>{bookData.help.addr}</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-amber-200" style={{ background: '#FFF3DC' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6210]">
                    Blood group
                  </p>
                  <p className="font-extrabold text-2xl ink mt-0.5">{bookData.help.blood}</p>
                </div>
              </div>
            </div>
          )}

          {/* Book navigation click target */}
          <div className="p-3 bg-[#F5EFE5] border-t flex justify-between items-center text-xs text-muted" style={{ borderColor: '#EBD6A8' }}>
            <button
              onClick={handlePrev}
              disabled={pageIndex === 0}
              className="font-bold text-[#0E7C66] hover:underline cursor-pointer disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous Page</span>
            </button>
            <span className="font-semibold text-[11px]">Tap arrows or buttons to turn</span>
            <button
              onClick={handleNext}
              disabled={pageIndex === totalPages}
              className="font-bold text-[#0E7C66] hover:underline cursor-pointer disabled:opacity-30 flex items-center gap-1"
            >
              <span>Next Page</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs muted mt-4 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>Pages woven with familiar things — tea gardens, Kaziranga, Bihu &amp; family memories</span>
      </p>
    </section>
  );
};
