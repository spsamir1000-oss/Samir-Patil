import {
  Smartphone,
  WifiOff,
  Download,
  CheckCircle,
  Cpu,
  Bookmark,
  Share2,
  Tv
} from 'lucide-react';

export default function AndroidAppInfo() {
  return (
    <div className="space-y-6">
      
      {/* Visual Launcher banner block */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-indigo-500" />
          Android App (Build APK)
        </h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Run the attendance app on mobile and learn how to build its APK file
        </p>
      </div>

      {/* Main Grid: Info columns and mockups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Offline & PWA features */}
        <div className="space-y-6">
          {/* Card 1: Offline Capability */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl w-10 h-10 flex items-center justify-center">
              <WifiOff className="w-5 h-5 animate-bounce" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">100% Offline Support (Runs Completely Offline)</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              This attendance app runs entirely offline and locally. The data is securely stored in your device's memory. 
              Therefore, even in rural areas without an internet connection, teachers can take attendance without any worries! 
            </p>
          </div>

          {/* Card 2: PWA Quick Installation */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl w-10 h-10 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">Install Directly on Mobile (Quick Install App)</h3>
            
            <div className="text-xs text-slate-600 font-medium space-y-2.5 leading-relaxed pl-1">
              <p className="font-bold text-slate-800">How to install directly using Chrome browser:</p>
              <div className="flex items-start gap-2">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">Step 1</span>
                <p>Open this app in the Chrome browser on your mobile phone.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">Step 2</span>
                <p>Click on the three dots (<span className="font-bold">Menu</span>) in the top right corner.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">Step 3</span>
                <p>Click on the <span className="text-indigo-600 font-bold">"Add to Home screen"</span> or <span className="text-indigo-600 font-bold">"Install App"</span> option there.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">Step 4</span>
                <p>The app will install and set up on your mobile home screen just like a native Android application! 📱</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mobile compilation guide */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl w-10 h-10 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-850">Build Android APK File (Build APK File)</h3>
          
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            If you want to convert this app into an Android file (.apk) and send it to other teachers in the school via WhatsApp, you can use this method:
          </p>

          <div className="space-y-3.5 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs space-y-1.5 font-semibold text-slate-700">
              <h4 className="text-slate-900 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                Build using Capacitor:
              </h4>
              <p className="text-slate-550 leading-relaxed font-medium">
                This app is converted into an Android project using the 'Capacitor' framework. Run the following commands in sequence:
              </p>
              <pre className="p-3 bg-slate-900 text-slate-350 rounded-lg text-[9px] font-mono overflow-x-auto leading-relaxed">
                # 1. Create a product build<br />
                npm run build<br /><br />
                # 2. Install Capacitor Android<br />
                npm install @capacitor/core @capacitor/cli @capacitor/android<br /><br />
                # 3. Initialize project<br />
                npx cap init "Attendance App" "com.attendance.app"<br />
                npx cap add android<br />
                npx cap copy android
              </pre>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs leading-relaxed space-y-1 text-slate-650 font-medium">
              <p className="font-bold text-slate-800">Next Steps:</p>
              <p>4. After setting everything up, open <span className="font-semibold text-indigo-600">Android Studio</span> and let Gradle sync complete.</p>
              <p>5. In Android Studio, click <span className="font-semibold text-indigo-600">Build ➜ Build Bundle(s) / APK(s) ➔ Build APK</span>.</p>
              <p>6. Your premium Attendance App <span className="font-bold text-emerald-600">"app-debug.apk"</span> will be generated! 🥳</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
