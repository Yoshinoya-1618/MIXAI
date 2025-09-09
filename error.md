[21:30:26.876] Running build in Washington, D.C., USA (East) – iad1
[21:30:26.877] Build machine configuration: 2 cores, 8 GB
[21:30:26.891] Cloning github.com/Yoshinoya-1618/MIXAI (Branch: master, Commit: b26ad84)
[21:30:26.899] Skipping build cache, deployment was triggered without cache.
[21:30:27.558] Cloning completed: 667.000ms
[21:30:27.925] Running "vercel build"
[21:30:28.381] Vercel CLI 47.0.5
[21:30:28.733] Warning: Detected "engines": { "node": ">=20" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: http://vercel.link/node-version
[21:30:28.750] Installing dependencies...
[21:30:32.013] npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
[21:30:32.121] npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
[21:30:41.649] 
[21:30:41.651] added 445 packages in 13s
[21:30:41.651] 
[21:30:41.651] 89 packages are looking for funding
[21:30:41.652]   run `npm fund` for details
[21:30:41.696] Detected Next.js version: 14.2.32
[21:30:41.700] Running "npm run build"
[21:30:41.982] 
[21:30:41.983] > uta-seion@0.1.0 build
[21:30:41.984] > next build
[21:30:41.984] 
[21:30:42.625]   ▲ Next.js 14.2.32
[21:30:42.626]   - Environments: .env.local, .env.production
[21:30:42.626] 
[21:30:42.645]    Creating an optimized production build ...
[21:30:55.152] <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (128kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
[21:30:55.222] Failed to compile.
[21:30:55.223] 
[21:30:55.223] ./app/result/[id]/page.tsx
[21:30:55.224] Error: 
[21:30:55.224]   [31mx[0m the name `StyleTokens` is defined multiple times
[21:30:55.224]      ,-[[36;1;4m/vercel/path0/app/result/[id]/page.tsx[0m:3:1]
[21:30:55.224]  [2m  3[0m | import { useSearchParams } from 'next/navigation'
[21:30:55.224]  [2m  4[0m | import { apiFetch } from '../../web/api'
[21:30:55.225]  [2m  5[0m | import Header from '../../../components/common/Header'
[21:30:55.225]  [2m  6[0m | import StyleTokens from '../../../components/common/StyleTokens'
[21:30:55.225]      : [31;1m       ^^^^^|^^^^^[0m
[21:30:55.225]      :             [31;1m`-- [31;1mprevious definition of `StyleTokens` here[0m[0m
[21:30:55.226]  [2m  7[0m | import Footer from '../../../components/common/Footer'
[21:30:55.226]  [2m  8[0m | 
[21:30:55.226]  [2m  9[0m | interface Props { params: { id: string } }
[21:30:55.226]  [2m 10[0m | 
[21:30:55.227]  [2m 11[0m | type Job = {
[21:30:55.227]  [2m 12[0m |   id: string
[21:30:55.227]  [2m 13[0m |   status: 'completed' | 'processing' | 'failed'
[21:30:55.227]  [2m 14[0m |   harmony_mode: 'upload' | 'generate'
[21:30:55.228]  [2m 15[0m |   harmony_pattern?: 'upper' | 'lower' | 'fifth'
[21:30:55.228]  [2m 16[0m |   created_at: string
[21:30:55.228]  [2m 17[0m |   completed_at?: string
[21:30:55.228]  [2m 18[0m | }
[21:30:55.229]  [2m 19[0m | 
[21:30:55.229]  [2m 20[0m | // =========================================
[21:30:55.229]  [2m 21[0m | // Palette & Tokens (統一感のため)
[21:30:55.229]  [2m 22[0m | // =========================================
[21:30:55.230]  [2m 23[0m | const COLORS = {
[21:30:55.230]  [2m 24[0m |   indigo: '#6366F1',
[21:30:55.230]  [2m 25[0m |   blue: '#22D3EE', 
[21:30:55.230]  [2m 26[0m |   magenta: '#F472B6',
[21:30:55.236]  [2m 27[0m |   bg: '#F7F7F9',
[21:30:55.236]  [2m 28[0m | }
[21:30:55.236]  [2m 29[0m | 
[21:30:55.236]  [2m 30[0m | function clsx(...a: Array<string | false | null | undefined>) {
[21:30:55.237]  [2m 31[0m |   return a.filter(Boolean).join(' ')
[21:30:55.239]  [2m 32[0m | }
[21:30:55.240]  [2m 33[0m | 
[21:30:55.240]  [2m 34[0m | export default function ResultPage({ params }: Props) {
[21:30:55.240]  [2m 35[0m |   const searchParams = useSearchParams()
[21:30:55.241]  [2m 36[0m |   const harmonyPattern = searchParams.get('harmony') as 'upper' | 'lower' | 'fifth' || 'upper'
[21:30:55.241]  [2m 37[0m |   
[21:30:55.241]  [2m 38[0m |   const [job, setJob] = useState<Job | null>(null)
[21:30:55.241]  [2m 39[0m |   const [mp3Url, setMp3Url] = useState<string>('')
[21:30:55.241]  [2m 40[0m |   const [wavUrl, setWavUrl] = useState<string>('')
[21:30:55.242]  [2m 41[0m |   const [loading, setLoading] = useState(true)
[21:30:55.248]  [2m 42[0m |   const [isPlaying, setIsPlaying] = useState(false)
[21:30:55.248]  [2m 43[0m | 
[21:30:55.248]  [2m 44[0m |   useEffect(() => {
[21:30:55.248]  [2m 45[0m |     ;(async () => {
[21:30:55.248]  [2m 46[0m |       try {
[21:30:55.249]  [2m 47[0m |         // Get job details
[21:30:55.249]  [2m 48[0m |         const jobRes = await apiFetch(`/api/v1/jobs/${params.id}`)
[21:30:55.249]  [2m 49[0m |         if (jobRes.ok) {
[21:30:55.249]  [2m 50[0m |           const jobData = await jobRes.json()
[21:30:55.249]  [2m 51[0m |           setJob(jobData)
[21:30:55.250]  [2m 52[0m |         }
[21:30:55.250]  [2m 53[0m | 
[21:30:55.250]  [2m 54[0m |         // Get download URLs
[21:30:55.250]  [2m 55[0m |         const mp3 = await apiFetch(`/api/v1/jobs/${params.id}/download?format=mp3&harmony=${harmonyPattern}`)
[21:30:55.250]  [2m 56[0m |         if (mp3.ok) setMp3Url((await mp3.json()).url)
[21:30:55.251]  [2m 57[0m |         
[21:30:55.251]  [2m 58[0m |         const wav = await apiFetch(`/api/v1/jobs/${params.id}/download?format=wav&harmony=${harmonyPattern}`)
[21:30:55.252]  [2m 59[0m |         if (wav.ok) setWavUrl((await wav.json()).url)
[21:30:55.252]  [2m 60[0m |       } finally {
[21:30:55.254]  [2m 61[0m |         setLoading(false)
[21:30:55.254]  [2m 62[0m |       }
[21:30:55.257]  [2m 63[0m |     })()
[21:30:55.257]  [2m 64[0m |   }, [params.id, harmonyPattern])
[21:30:55.258]  [2m 65[0m | 
[21:30:55.258]  [2m 66[0m |   if (loading) {
[21:30:55.258]  [2m 67[0m |     return (
[21:30:55.258]  [2m 68[0m |       <main className="min-h-screen bg-[var(--bg)] text-gray-900">
[21:30:55.258]  [2m 69[0m |         <StyleTokens />
[21:30:55.258]  [2m 70[0m |         <AuroraBackground />
[21:30:55.259]  [2m 71[0m |         <Header currentPage="result" />
[21:30:55.259]  [2m 72[0m |         
[21:30:55.259]  [2m 73[0m |         <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
[21:30:55.259]  [2m 74[0m |           <div className="glass-card p-8 text-center">
[21:30:55.259]  [2m 75[0m |             <div className="animate-pulse">
[21:30:55.260]  [2m 76[0m |               <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
[21:30:55.260]  [2m 77[0m |             </div>
[21:30:55.260]  [2m 78[0m |             <p className="mt-2 text-gray-600">処理結果を取得中...</p>
[21:30:55.260]  [2m 79[0m |           </div>
[21:30:55.260]  [2m 80[0m |         </div>
[21:30:55.261]  [2m 81[0m |         <Footer />
[21:30:55.261]  [2m 82[0m |       </main>
[21:30:55.261]  [2m 83[0m |     )
[21:30:55.261]  [2m 84[0m |   }
[21:30:55.261]  [2m 85[0m | 
[21:30:55.262]  [2m 86[0m |   return (
[21:30:55.262]  [2m 87[0m |     <main className="min-h-screen bg-[var(--bg)] text-gray-900">
[21:30:55.262]  [2m 88[0m |       {/* Style tokens */}
[21:30:55.262]  [2m 89[0m |       <StyleTokens />
[21:30:55.262]  [2m 90[0m |       
[21:30:55.262]  [2m 91[0m |       {/* Background aura */}
[21:30:55.263]  [2m 92[0m |       <AuroraBackground />
[21:30:55.263]  [2m 93[0m |       
[21:30:55.263]  [2m 94[0m |       {/* Header */}
[21:30:55.263]  [2m 95[0m |       <Header currentPage="result" />
[21:30:55.263]  [2m 96[0m |       
[21:30:55.264]  [2m 97[0m |       <div className="relative mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-16">
[21:30:55.264]  [2m 98[0m |         <div className="space-y-8">
[21:30:55.264]  [2m 99[0m |           {/* ヘッダー */}
[21:30:55.264]  [2m100[0m |           <div className="text-center">
[21:30:55.264]  [2m101[0m |             <h1 className="font-semibold tracking-[-0.02em] text-[32px] sm:text-[40px] leading-[1.25]">
[21:30:55.265]  [2m102[0m |               MIX完了！
[21:30:55.265]  [2m103[0m |             </h1>
[21:30:55.265]  [2m104[0m |             <p className="mt-4 text-lg text-gray-700">
[21:30:55.265]  [2m105[0m |               あなたの歌ってみたが完成しました
[21:30:55.266]  [2m106[0m |             </p>
[21:30:55.266]  [2m107[0m |           </div>
[21:30:55.266]  [2m108[0m | 
[21:30:55.266]  [2m109[0m |           {/* 完成品プレイヤー */}
[21:30:55.266]  [2m110[0m |           <div className="glass-card p-8">
[21:30:55.267]  [2m111[0m |             <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
[21:30:55.267]  [2m112[0m |               <MusicIcon className="w-5 h-5 text-emerald-600" />
[21:30:55.267]  [2m113[0m |               完成作品
[21:30:55.267]  [2m114[0m |             </h2>
[21:30:55.267]  [2m115[0m |             
[21:30:55.268]  [2m116[0m |             <div className="space-y-6">
[21:30:55.268]  [2m117[0m |               <div className="text-center">
[21:30:55.268]  [2m118[0m |                 {mp3Url ? (
[21:30:55.268]  [2m119[0m |                   <audio 
[21:30:55.268]  [2m120[0m |                     controls 
[21:30:55.269]  [2m121[0m |                     src={mp3Url} 
[21:30:55.269]  [2m122[0m |                     className="w-full max-w-md mx-auto rounded-lg"
[21:30:55.269]  [2m123[0m |                     onPlay={() => setIsPlaying(true)}
[21:30:55.269]  [2m124[0m |                     onPause={() => setIsPlaying(false)}
[21:30:55.269]  [2m125[0m |                   />
[21:30:55.270]  [2m126[0m |                 ) : (
[21:30:55.270]  [2m127[0m |                   <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
[21:30:55.270]  [2m128[0m |                     <LoadingIcon className="w-5 h-5 text-gray-500 animate-spin" />
[21:30:55.270]  [2m129[0m |                     <span className="text-gray-600">音声ファイルを準備中...</span>
[21:30:55.270]  [2m130[0m |                   </div>
[21:30:55.271]  [2m131[0m |                 )}
[21:30:55.271]  [2m132[0m |               </div>
[21:30:55.271]  [2m133[0m | 
[21:30:55.271]  [2m134[0m |               {job?.harmony_mode === 'generate' && (
[21:30:55.272]  [2m135[0m |                 <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/50">
[21:30:55.272]  [2m136[0m |                   <div className="flex items-center gap-3 mb-2">
[21:30:55.272]  [2m137[0m |                     <SparklesIcon className="w-5 h-5 text-emerald-600" />
[21:30:55.272]  [2m138[0m |                     <div className="font-medium text-emerald-900">AI生成ハモリ適用済み</div>
[21:30:55.272]  [2m139[0m |                   </div>
[21:30:55.273]  [2m140[0m |                   <div className="text-sm text-emerald-700">
[21:30:55.273]  [2m141[0m |                     選択パターン: {
[21:30:55.273]  [2m142[0m |                       harmonyPattern === 'upper' ? '上ハモ' :
[21:30:55.273]  [2m143[0m |                       harmonyPattern === 'lower' ? '下ハモ' : '5度ハモ'
[21:30:55.273]  [2m144[0m |                     }
[21:30:55.273]  [2m145[0m |                   </div>
[21:30:55.275]  [2m146[0m |                 </div>
[21:30:55.275]  [2m147[0m |               )}
[21:30:55.275]  [2m148[0m |             </div>
[21:30:55.276]  [2m149[0m |           </div>
[21:30:55.276]  [2m150[0m | 
[21:30:55.276]  [2m151[0m |           {/* ダウンロード */}
[21:30:55.276]  [2m152[0m |           <div className="glass-card p-8">
[21:30:55.277]  [2m153[0m |             <h2 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
[21:30:55.277]  [2m154[0m |               <DownloadIcon className="w-5 h-5 text-blue-600" />
[21:30:55.277]  [2m155[0m |               ダウンロード
[21:30:55.277]  [2m156[0m |             </h2>
[21:30:55.277]  [2m157[0m |             
[21:30:55.277]  [2m158[0m |             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
[21:30:55.278]  [2m159[0m |               <button
[21:30:55.278]  [2m160[0m |                 className={clsx(
[21:30:55.278]  [2m161[0m |                   "flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all text-left",
[21:30:55.278]  [2m162[0m |                   mp3Url 
[21:30:55.278]  [2m163[0m |                     ? "border-blue-300 bg-blue-50/80 hover:bg-blue-50 hover:border-blue-400 cursor-pointer" 
[21:30:55.279]  [2m164[0m |                     : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
[21:30:55.279]  [2m165[0m |                 )}
[21:30:55.279]  [2m166[0m |                 onClick={() => mp3Url && window.open(mp3Url, '_blank')}
[21:30:55.279]  [2m167[0m |                 disabled={!mp3Url}
[21:30:55.279]  [2m168[0m |               >
[21:30:55.280]  [2m169[0m |                 <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
[21:30:55.280]  [2m170[0m |                   <DownloadIcon className="w-6 h-6 text-white" />
[21:30:55.280]  [2m171[0m |                 </div>
[21:30:55.280]  [2m172[0m |                 <div>
[21:30:55.281]  [2m173[0m |                   <div className="font-medium text-gray-900">MP3ダウンロード</div>
[21:30:55.281]  [2m174[0m |                   <div className="text-sm text-gray-600">高音質・軽量形式</div>
[21:30:55.281]  [2m175[0m |                 </div>
[21:30:55.281]  [2m176[0m |               </button>
[21:30:55.281]  [2m177[0m | 
[21:30:55.282]  [2m178[0m |               <button
[21:30:55.282]  [2m179[0m |                 className={clsx(
[21:30:55.285]  [2m180[0m |                   "flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all text-left",
[21:30:55.285]  [2m181[0m |                   wavUrl 
[21:30:55.285]  [2m182[0m |                     ? "border-purple-300 bg-purple-50/80 hover:bg-purple-50 hover:border-purple-400 cursor-pointer" 
[21:30:55.286]  [2m183[0m |                     : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
[21:30:55.286]  [2m184[0m |                 )}
[21:30:55.286]  [2m185[0m |                 onClick={() => wavUrl && window.open(wavUrl, '_blank')}
[21:30:55.286]  [2m186[0m |                 disabled={!wavUrl}
[21:30:55.287]  [2m187[0m |               >
[21:30:55.287]  [2m188[0m |                 <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
[21:30:55.287]  [2m189[0m |                   <DownloadIcon className="w-6 h-6 text-white" />
[21:30:55.287]  [2m190[0m |                 </div>
[21:30:55.287]  [2m191[0m |                 <div>
[21:30:55.288]  [2m192[0m |                   <div className="font-medium text-gray-900">WAVダウンロード</div>
[21:30:55.288]  [2m193[0m |                   <div className="text-sm text-gray-600">最高音質・非圧縮</div>
[21:30:55.288]  [2m194[0m |                 </div>
[21:30:55.288]  [2m195[0m |               </button>
[21:30:55.288]  [2m196[0m |             </div>
[21:30:55.289]  [2m197[0m |           </div>
[21:30:55.289]  [2m198[0m | 
[21:30:55.289]  [2m199[0m |           {/* 処理詳細 */}
[21:30:55.289]  [2m200[0m |           <div className="glass-card p-8">
[21:30:55.289]  [2m201[0m |             <h2 className="font-semibold text-gray-900 mb-6">処理詳細</h2>
[21:30:55.289]  [2m202[0m |             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
[21:30:55.290]  [2m203[0m |               <div className="text-center p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50">
[21:30:55.290]  [2m204[0m |                 <div className="text-gray-600 mb-1">ジョブID</div>
[21:30:55.290]  [2m205[0m |                 <div className="font-mono text-xs text-gray-900 break-all">{params.id}</div>
[21:30:55.291]  [2m206[0m |               </div>
[21:30:55.291]  [2m207[0m |               <div className="text-center p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200/50">
[21:30:55.292]  [2m208[0m |                 <div className="text-gray-600 mb-1">処理時間</div>
[21:30:55.292]  [2m209[0m |                 <div className="font-semibold text-gray-900">
[21:30:55.292]  [2m210[0m |                   {job?.completed_at && job?.created_at ? 
[21:30:55.292]  [2m211[0m |                     `${Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)}秒` :
[21:30:55.292]  [2m212[0m |                     '計算中'
[21:30:55.292]  [2m213[0m |                   }
[21:30:55.292]  [2m214[0m |                 </div>
[21:30:55.293]  [2m215[0m |               </div>
[21:30:55.293]  [2m216[0m |               <div className="text-center p-4 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-xl border border-purple-200/50">
[21:30:55.293]  [2m217[0m |                 <div className="text-gray-600 mb-1">音質</div>
[21:30:55.293]  [2m218[0m |                 <div className="font-semibold text-gray-900">-14 LUFS / -1 dBTP</div>
[21:30:55.293]  [2m219[0m |               </div>
[21:30:55.294]  [2m220[0m |             </div>
[21:30:55.294]  [2m221[0m |           </div>
[21:30:55.294]  [2m222[0m | 
[21:30:55.294]  [2m223[0m |           {/* クレジット表記 */}
[21:30:55.295]  [2m224[0m |           <div className="glass-card p-8">
[21:30:55.295]  [2m225[0m |             <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
[21:30:55.295]  [2m226[0m |               <InfoIcon className="w-5 h-5 text-blue-600" />
[21:30:55.295]  [2m227[0m |               クレジット表記
[21:30:55.295]  [2m228[0m |             </h2>
[21:30:55.296]  [2m229[0m |             <div className="p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-lg border border-gray-200/50">
[21:30:55.296]  [2m230[0m |               <div className="text-sm text-gray-700 mb-2">
[21:30:55.296]  [2m231[0m |                 動画投稿時にご使用ください：
[21:30:55.296]  [2m232[0m |               </div>
[21:30:55.296]  [2m233[0m |               <div className="font-mono text-sm bg-white/80 p-3 rounded border select-all">
[21:30:55.297]  [2m234[0m |                 MIX & Mastering: MIXAI (-14 LUFS / -1 dBTP)
[21:30:55.297]  [2m235[0m |               </div>
[21:30:55.297]  [2m236[0m |               <div className="text-xs text-gray-500 mt-2">
[21:30:55.297]  [2m237[0m |                 ※ クリックしてコピーできます
[21:30:55.297]  [2m238[0m |               </div>
[21:30:55.297]  [2m239[0m |             </div>
[21:30:55.298]  [2m240[0m |           </div>
[21:30:55.298]  [2m241[0m | 
[21:30:55.298]  [2m242[0m |           {/* 次のアクション */}
[21:30:55.298]  [2m243[0m |           <div className="text-center">
[21:30:55.298]  [2m244[0m |             <button 
[21:30:55.298]  [2m245[0m |               className="btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all"
[21:30:55.299]  [2m246[0m |               onClick={() => window.location.href = '/upload'}
[21:30:55.299]  [2m247[0m |             >
[21:30:55.299]  [2m248[0m |               <div className="flex items-center gap-2">
[21:30:55.299]  [2m249[0m |                 <PlusIcon className="w-5 h-5" />
[21:30:55.299]  [2m250[0m |                 <span>新しい楽曲をMIXする</span>
[21:30:55.299]  [2m251[0m |               </div>
[21:30:55.300]  [2m252[0m |             </button>
[21:30:55.300]  [2m253[0m |           </div>
[21:30:55.300]  [2m254[0m |         </div>
[21:30:55.300]  [2m255[0m |       </div>
[21:30:55.300]  [2m256[0m |       
[21:30:55.300]  [2m257[0m |       <Footer />
[21:30:55.300]  [2m258[0m |     </main>
[21:30:55.301]  [2m259[0m |   )
[21:30:55.301]  [2m260[0m | }
[21:30:55.301]  [2m261[0m | 
[21:30:55.301]  [2m262[0m | // =========================================
[21:30:55.301]  [2m263[0m | // Shared Components
[21:30:55.301]  [2m264[0m | // =========================================
[21:30:55.302]  [2m265[0m | 
[21:30:55.302]  [2m266[0m | function StyleTokens() {
[21:30:55.302]      : [33;1m         ^^^^^|^^^^^[0m
[21:30:55.302]      :               [33;1m`-- [33;1m`StyleTokens` redefined here[0m[0m
[21:30:55.302]  [2m267[0m |   return (
[21:30:55.302]  [2m268[0m |     <style jsx>{`
[21:30:55.303]  [2m269[0m |       :root {
[21:30:55.303]      `----
[21:30:55.303] 
[21:30:55.303] Import trace for requested module:
[21:30:55.303] ./app/result/[id]/page.tsx
[21:30:55.303] 
[21:30:55.313] 
[21:30:55.313] > Build failed because of webpack errors
[21:30:55.358] Error: Command "npm run build" exited with 1