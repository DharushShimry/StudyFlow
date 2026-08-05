import { useState, useEffect } from 'react';
import { UserCircle, PenTool, IdCard, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { listItems, getItemBlob, type PersonalItem } from '../services/personalStore';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Page } from '../types';

interface ProfileCardProps {
  setPage: (p: Page) => void;
}

function isImage(type: string) {
  return type.startsWith('image/');
}

export default function ProfileCard({ setPage }: ProfileCardProps) {
  const { currentUser } = useAuth();
  const { settings } = useSettings();

  const [logo, setLogo] = useState<PersonalItem & { url: string } | null>(null);
  const [signature, setSignature] = useState<PersonalItem & { url: string } | null>(null);
  const [nicItems, setNicItems] = useState<(PersonalItem & { url: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    (async () => {
      try {
        const all = await listItems();
        const withUrls: (PersonalItem & { url: string })[] = [];
        for (const item of all) {
          const blob = await getItemBlob(item.id);
          // Check after the await so an unmount during it can't leak a new URL
          if (cancelled) break;
          if (!blob) continue;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          withUrls.push({ ...item, url });
        }
        if (cancelled) return;
        setLogo(withUrls.find(i => i.slot === 'logo') ?? null);
        setSignature(withUrls.find(i => i.slot === 'signature') ?? null);
        setNicItems(withUrls.filter(i => i.slot === 'nic'));
      } catch {
        // Leave placeholders on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  return (
    <div className="card-glow bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
      <div className="flex flex-wrap items-center gap-4 p-5 bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-transparent dark:from-rose-900/15 dark:via-amber-900/10 dark:to-transparent">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-rose-200 dark:ring-rose-800/50 shadow-lg flex-shrink-0 bg-white dark:bg-slate-700 flex items-center justify-center">
          {loading ? (
            <Loader2 size={24} className="text-slate-300 animate-spin"/>
          ) : logo ? (
            <img src={logo.url} alt="Profile logo" className="w-full h-full object-contain"/>
          ) : (
            <UserCircle size={32} className="text-slate-300 dark:text-slate-500"/>
          )}
        </div>

        {/* Identity + signature */}
        <div className="flex-1 min-w-[160px]">
          <div className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
            {currentUser || settings.appName}
          </div>
          {signature ? (
            <div className="mt-1.5">
              <img src={signature.url} alt="Signature" title="Your signature" className="h-10 max-w-[180px] object-contain opacity-90"/>
            </div>
          ) : (
            !loading && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                <PenTool size={11}/> Add your signature in Personal Space
              </div>
            )
          )}
        </div>

        {/* NIC previews */}
        <div className="flex flex-col items-start gap-1.5 min-w-[120px]">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <IdCard size={13} className="text-rose-500"/> National ID
          </div>
          {nicItems.length > 0 ? (
            <div className="flex items-center gap-2">
              {nicItems.slice(0, 3).map(item =>
                isImage(item.type) ? (
                  <img key={item.id} src={item.url} alt={item.name} title={item.name} className="w-11 h-14 rounded-lg object-contain border border-slate-200 dark:border-slate-600 shadow-sm"/>
                ) : (
                  <div key={item.id} className="w-11 h-14 rounded-lg bg-red-50 dark:bg-red-900/30 border border-slate-200 dark:border-slate-600 flex items-center justify-center" title={item.name}>
                    <FileText size={16} className="text-red-500"/>
                  </div>
                )
              )}
              {nicItems.length > 3 && (
                <div className="text-[10px] text-slate-400 font-medium">+{nicItems.length - 3}</div>
              )}
            </div>
          ) : (
            !loading && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <FileText size={11}/> No NIC saved yet
              </div>
            )
          )}
        </div>

        {/* Manage */}
        <button
          onClick={() => setPage('personal')}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 rounded-xl shadow hover:shadow-lg hover:scale-[1.03] transition-all"
        >
          <IdCard size={14}/> Manage <ArrowRight size={12}/>
        </button>
      </div>
    </div>
  );
}
