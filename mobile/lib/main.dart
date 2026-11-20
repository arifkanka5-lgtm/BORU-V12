import 'package:socket_io_client/socket_io_client.dart' as io;
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:livekit_client/livekit_client.dart' as lk;
import 'package:permission_handler/permission_handler.dart';

// Override with --dart-define=API_BASE_URL=http://YOUR_LAN_IP:3001/api/v1
const apiBase = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3001/api/v1');
const bg = Color(0xFF0B0D20);
const purple = Color(0xFF7B2FE8);
void main() => runApp(const BoruApp());
class BoruApp extends StatelessWidget {
  const BoruApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner:false, title:'BÖRÜ', theme:ThemeData.dark().copyWith(scaffoldBackgroundColor:bg,colorScheme:const ColorScheme.dark(primary:purple)), home:const LoginScreen());
}
class Api {
  static Future<dynamic> getAuthorized(String path,String token) async {
    final r=await http.get(Uri.parse('$apiBase$path'),headers:{'Authorization':'Bearer $token'});
    if(r.statusCode<200||r.statusCode>=300)throw Exception('HTTP ${r.statusCode}: ${r.body}');
    return jsonDecode(r.body);
  }

  static Future<Map<String,dynamic>> post(String path, Map<String,dynamic> body, [String? token]) async {
    final r=await http.post(Uri.parse('$apiBase$path'), headers:{'Content-Type':'application/json', if(token!=null) 'Authorization':'Bearer $token'},body:jsonEncode(body));
    final decoded=jsonDecode(r.body);
    if(r.statusCode<200 || r.statusCode>=300) throw Exception(decoded is Map ? (decoded['message']??'API error').toString() : 'API error');
    return Map<String,dynamic>.from(decoded);
  }
  static Future<List<dynamic>> rooms() async {
    final r=await http.get(Uri.parse('$apiBase/rooms'));
    if(r.statusCode!=200) throw Exception('Odalar yüklenemedi (${r.statusCode})');
    return jsonDecode(r.body) as List<dynamic>;
  }
}
class LoginScreen extends StatefulWidget {const LoginScreen({super.key});@override State<LoginScreen> createState()=>_LoginScreenState();}
class _LoginScreenState extends State<LoginScreen> {
  final email=TextEditingController(), password=TextEditingController(), name=TextEditingController();
  bool register=false, busy=false; String? error;
  Future<void> submit() async {
    setState(() {busy=true;error=null;});
    try {
      if(register) await Api.post('/auth/register',{'email':email.text.trim(),'password':password.text,'displayName':name.text.trim()});
      final response=await Api.post('/auth/login',{'email':email.text.trim(),'password':password.text});
      if(mounted) Navigator.pushReplacement(context,MaterialPageRoute(builder:(_)=>RoomsScreen(token:response['accessToken'] as String)));
    } catch(e) {if(mounted)setState(()=>error=e.toString());}
    finally {if(mounted)setState(()=>busy=false);}
  }
  @override void dispose(){email.dispose();password.dispose();name.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(padding:const EdgeInsets.all(28),child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:430),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.nights_stay,size:78,color:Color(0xFFE9B653)),const Text('BÖRÜ',style:TextStyle(fontSize:48,fontWeight:FontWeight.bold,letterSpacing:7)),const Text('Global Sesli Sohbet'),const SizedBox(height:32),if(register)TextField(controller:name,decoration:const InputDecoration(labelText:'Kullanıcı adı')),TextField(controller:email,keyboardType:TextInputType.emailAddress,decoration:const InputDecoration(labelText:'E-posta')),TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Şifre')),const SizedBox(height:20),if(error!=null)Text(error!,style:const TextStyle(color:Colors.redAccent)),FilledButton(onPressed:busy?null:submit,child:Text(busy?'Bekleyin...':register?'Kayıt Ol':'Giriş Yap')),TextButton(onPressed:()=>setState(()=>register=!register),child:Text(register?'Hesabım var':'Yeni hesap oluştur'))]))))));
}
class RoomsScreen extends StatefulWidget {final String token;const RoomsScreen({super.key,required this.token});@override State<RoomsScreen> createState()=>_RoomsScreenState();}
class _RoomsScreenState extends State<RoomsScreen> {
  late Future<List<dynamic>> future;
  @override void initState(){super.initState();reload();}
  void reload()=>setState(()=>future=Api.rooms());
  Future<void> create() async {
    final c=TextEditingController();
    final title=await showDialog<String>(context:context,builder:(ctx)=>AlertDialog(title:const Text('Yeni oda'),content:TextField(controller:c,decoration:const InputDecoration(hintText:'Oda adı')),actions:[TextButton(onPressed:()=>Navigator.pop(ctx),child:const Text('İptal')),FilledButton(onPressed:()=>Navigator.pop(ctx,c.text),child:const Text('Oluştur'))]));
    c.dispose();if(title==null||title.trim().length<3)return;
    try{await Api.post('/rooms',{'title':title.trim()},widget.token);reload();}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}
  }
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('BÖRÜ • Sesli Odalar'),actions:[IconButton(tooltip:'Coin ve hediyeler',onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>WalletScreen(token:widget.token))),icon:const Icon(Icons.toll)),IconButton(onPressed:reload,icon:const Icon(Icons.refresh))]),floatingActionButton:FloatingActionButton(onPressed:create,child:const Icon(Icons.add)),body:FutureBuilder<List<dynamic>>(future:future,builder:(context,s){if(!s.hasData)return Center(child:Text(s.hasError?'Hata: ${s.error}':'Odalar yükleniyor...'));if(s.data!.isEmpty)return const Center(child:Text('Henüz oda yok. İlk odayı oluştur!'));return ListView.builder(itemCount:s.data!.length,itemBuilder:(ctx,i){final room=s.data![i] as Map<String,dynamic>;return Card(color:const Color(0xFF1B1838),child:ListTile(leading:const Icon(Icons.mic,color:purple),title:Text(room['title'].toString()),trailing:const Icon(Icons.chevron_right),onTap:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>InteractiveRoomScreen(roomId:room['id'].toString(),title:room['title'].toString(),token:widget.token))));});}));
}
class VoiceRoomScreen extends StatefulWidget {final String roomId,title,token;const VoiceRoomScreen({super.key,required this.roomId,required this.title,required this.token});@override State<VoiceRoomScreen> createState()=>_VoiceRoomScreenState();}
class _VoiceRoomScreenState extends State<VoiceRoomScreen> {
  lk.Room? room;bool connecting=true, muted=true;String? error;
  @override void initState(){super.initState();connect();}
  Future<void> connect() async {
    try {
      final permission=await Permission.microphone.request();
      if(!permission.isGranted)throw Exception('Mikrofon izni gerekli');
      final credentials=await Api.post('/rooms/${widget.roomId}/rtc-token',{},widget.token);
      final r=lk.Room();
      await r.connect(credentials['serverUrl'] as String,credentials['token'] as String);
      // Publishing is enabled only after server-authorized seat assignment.
      await r.localParticipant?.setMicrophoneEnabled(false);
      if(!mounted){await r.disconnect();await r.dispose();return;}
      setState((){room=r;connecting=false;});
    }catch(e){if(mounted)setState((){error=e.toString();connecting=false;});}
  }
  Future<void> toggleMic() async {final r=room;if(r==null)return;await r.localParticipant?.setMicrophoneEnabled(muted);if(mounted)setState(()=>muted=!muted);}
  Future<void> leave() async {await room?.disconnect();if(mounted)Navigator.pop(context);}
  @override void dispose(){final r=room;if(r!=null){r.disconnect().then((_)=>r.dispose());}super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(widget.title),leading:IconButton(icon:const Icon(Icons.arrow_back),onPressed:leave)),body:Center(child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[const Icon(Icons.graphic_eq,size:90,color:purple),const SizedBox(height:20),Text(connecting?'Bağlanıyor...':error??'Sesli odaya bağlandın',textAlign:TextAlign.center),const SizedBox(height:20),if(!connecting&&error==null)FilledButton.icon(onPressed:toggleMic,icon:Icon(muted?Icons.mic_off:Icons.mic),label:Text(muted?'Mikrofonu Aç':'Mikrofonu Kapat')),const SizedBox(height:10),OutlinedButton(onPressed:leave,child:const Text('Odadan Ayrıl'))])));
}


// V5: live room experience. Gifts are preview-only until a verified ledger exists.
class InteractiveRoomScreen extends StatefulWidget {
  final String roomId, title, token;
  const InteractiveRoomScreen({super.key, required this.roomId, required this.title, required this.token});
  @override State<InteractiveRoomScreen> createState() => _InteractiveRoomScreenState();
}
class _InteractiveRoomScreenState extends State<InteractiveRoomScreen> {
  static const gold=Color(0xFFE9B653), panel=Color(0xFF201A3D);
  final input=TextEditingController();
  io.Socket? socket;
  lk.Room? voice;
  List<dynamic> seats=[], messages=[], participants=[], moderators=[];
  String? error, myId;
  bool loading=true, sending=false, voiceConnecting=false, micOn=false;
  @override void initState(){super.initState();initialize();}
  Future<dynamic> get(String path) async {
    final r=await http.get(Uri.parse('$apiBase$path'),headers:{'Authorization':'Bearer ${widget.token}'});
    if(r.statusCode>=300)throw Exception('HTTP ${r.statusCode}: ${r.body}');
    return jsonDecode(r.body);
  }
  Future<void> initialize() async {
    try {final me=await get('/me');myId=me['id']?.toString();}catch(e){error='$e';}
    await refresh();
    final base=Uri.parse(apiBase);
    socket=io.io('${base.scheme}://${base.authority}/rooms',io.OptionBuilder().setTransports(['websocket']).disableAutoConnect().setAuth({'token':widget.token}).build());
    socket!.onConnect((_){socket!.emit('room:join',{'roomId':widget.roomId});});
    for(final event in ['seats:changed','message:new','moderators:changed','participant:muted']) {socket!.on(event,(_){if(mounted)refresh();});}
    socket!.on('room:kicked',(_){if(mounted){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Odadan çıkarıldınız')));Navigator.pop(context);}});
    socket!.connect();
  }
  Future<void> refresh() async {
    try {
      final data=await Future.wait([get('/rooms/${widget.roomId}/seats'),get('/rooms/${widget.roomId}/messages'),get('/rooms/${widget.roomId}/moderators')]);
      if(mounted)setState((){seats=data[0];messages=data[1];moderators=data[2];loading=false;error=null;});
    }catch(e){if(mounted)setState((){loading=false;error='$e';});}
    try {final people=await get('/rooms/${widget.roomId}/participants');if(mounted)setState(()=>participants=people);}catch(_){/* LiveKit may not yet be configured. */}
  }
  Future<void> action(Future<void> Function() operation) async {
    if(sending)return;setState(()=>sending=true);
    try {await operation();await refresh();}catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('$e')));}
    finally {if(mounted)setState(()=>sending=false);}
  }
  Future<void> takeSeat(int number) => action(() async {await Api.post('/rooms/${widget.roomId}/seats/$number/take',{},widget.token);});
  Future<void> releaseSeat(int number)=>action(() async {
    final r=await http.delete(Uri.parse('$apiBase/rooms/${widget.roomId}/seats/$number'),headers:{'Authorization':'Bearer ${widget.token}'});
    if(r.statusCode>=300)throw Exception('Koltuk bırakılamadı: ${r.body}');
    await voice?.localParticipant?.setMicrophoneEnabled(false);
    if(mounted)setState(()=>micOn=false);
  });
  Future<void> sendMessage() async {
    final content=input.text.trim();if(content.isEmpty)return;
    await action(() async {await Api.post('/rooms/${widget.roomId}/messages',{'content':content},widget.token);input.clear();});
  }
  bool get hasSeat=>seats.any((s)=>s['userId']?.toString()==myId);
  Future<void> connectVoice() async {
    if(voiceConnecting||voice!=null)return;
    setState(()=>voiceConnecting=true);
    try {
      final permission=await Permission.microphone.request();
      if(!permission.isGranted)throw Exception('Mikrofon izni verilmedi');
      final credentials=await Api.post('/rooms/${widget.roomId}/rtc-token',{},widget.token);
      final r=lk.Room();await r.connect(credentials['serverUrl'] as String,credentials['token'] as String);
      await r.localParticipant?.setMicrophoneEnabled(false);
      if(!mounted){await r.disconnect();await r.dispose();return;}
      setState(()=>voice=r);
      await refresh();
    }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Ses bağlantısı: $e')));}
    finally{if(mounted)setState(()=>voiceConnecting=false);}
  }
  Future<void> toggleMic() async {
    if(voice==null||!hasSeat)return;
    try{await voice!.localParticipant?.setMicrophoneEnabled(!micOn);if(mounted)setState(()=>micOn=!micOn);}
    catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Mikrofon yetkisi: $e')));}
  }
  Future<void> moderatorMenu(String userId,String displayName) async {
    if(userId==myId)return;
    await showModalBottomSheet(context:context,backgroundColor:panel,builder:(ctx)=>SafeArea(child:Column(mainAxisSize:MainAxisSize.min,children:[
      ListTile(title:Text(displayName,style:const TextStyle(color:gold)),subtitle:const Text('Yönetim işlemleri yalnızca yetkili hesaplarda çalışır')),
      ListTile(leading:const Icon(Icons.volume_off),title:const Text('Kullanıcıyı sustur'),onTap:(){Navigator.pop(ctx);action(()async{await Api.post('/rooms/${widget.roomId}/mute/$userId',{},widget.token);});}),
      ListTile(leading:const Icon(Icons.admin_panel_settings),title:const Text('Moderatör yap'),onTap:(){Navigator.pop(ctx);action(()async{await Api.post('/rooms/${widget.roomId}/moderators/$userId',{},widget.token);});}),
      ListTile(leading:const Icon(Icons.block,color:Colors.redAccent),title:const Text('Odadan yasakla'),onTap:(){Navigator.pop(ctx);action(()async{await Api.post('/rooms/${widget.roomId}/ban/$userId',{},widget.token);});}),
    ])));
  }
  Future<void> giftsPreview() async {
    try {
      final gifts=List<Map<String,dynamic>>.from((await Api.getAuthorized('/economy/gifts',widget.token) as List).map((e)=>Map<String,dynamic>.from(e)));
      if(!mounted)return;
      if(gifts.isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Hediye kataloğu henüz boş')));return;}
      await showModalBottomSheet(context:context,backgroundColor:panel,isScrollControlled:true,builder:(ctx)=>SafeArea(child:Padding(padding:const EdgeInsets.all(18),child:Column(mainAxisSize:MainAxisSize.min,children:[
        const Text('🎁 BÖRÜ Hediye Mağazası',style:TextStyle(fontSize:21,fontWeight:FontWeight.bold)),
        const SizedBox(height:10),const Text('Hediye göndermek için bir alıcı seç',style:TextStyle(color:Colors.white70)),
        SizedBox(height:260,child:ListView(children:[for(final gift in gifts)ListTile(
          leading:const Icon(Icons.card_giftcard,color:gold),title:Text(gift['name'].toString()),subtitle:Text('${gift['priceCoins']} Coin'),
          onTap:(){Navigator.pop(ctx);selectGiftRecipient(gift);},
        )])),
      ]))));
    }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Hediye kataloğu: $e')));}
  }
  Future<void> selectGiftRecipient(Map<String,dynamic> gift) async {
    final eligible=participants.where((p)=>p['id']?.toString()!=myId && p['id']!=null).toList();
    if(eligible.isEmpty){ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Önce odaya başka bir kullanıcı katılmalı')));return;}
    await showModalBottomSheet(context:context,backgroundColor:panel,builder:(ctx)=>SafeArea(child:ListView(shrinkWrap:true,children:[
      ListTile(title:Text('${gift['name']} • ${gift['priceCoins']} Coin'),subtitle:const Text('Alıcı seçin. İşlem coin bakiyenizden düşülür.')),
      for(final person in eligible)ListTile(leading:const CircleAvatar(child:Icon(Icons.person)),title:Text(person['name']?.toString()??'Kullanıcı'),onTap:()async{
        Navigator.pop(ctx);
        final recipient=person['id'].toString();
        final confirm=await showDialog<bool>(context:context,builder:(d)=>AlertDialog(title:const Text('Hediyeyi gönder?'),content:Text('${person['name']??'Kullanıcı'} için ${gift['priceCoins']} Coin harcanacak.'),actions:[TextButton(onPressed:()=>Navigator.pop(d,false),child:const Text('Vazgeç')),FilledButton(onPressed:()=>Navigator.pop(d,true),child:const Text('Gönder'))]));
        if(confirm!=true||!mounted)return;
        await action(()async{
          final requestId='gift_${DateTime.now().microsecondsSinceEpoch}_${myId}';
          await Api.post('/economy/gifts/send',{'roomId':widget.roomId,'receiverId':recipient,'giftId':gift['id'],'requestId':requestId},widget.token);
          if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('🎁 ${gift['name']} gönderildi!')));
        });
      })
    ])));
  }
  Widget _seat(int number,Map<int,dynamic> occupied){
    final item=occupied[number];final user=item?['user'];final userId=item?['userId']?.toString();
    final name=user?['displayName']?.toString()??'Koltuk $number';final mine=userId!=null&&userId==myId;
    return InkWell(borderRadius:BorderRadius.circular(18),onTap:sending?null:(){if(item==null)takeSeat(number);else if(mine)releaseSeat(number);else if(userId!=null)moderatorMenu(userId,name);},child:Container(padding:const EdgeInsets.symmetric(vertical:12,horizontal:4),decoration:BoxDecoration(color:panel,borderRadius:BorderRadius.circular(18),border:Border.all(color:mine?gold:Colors.white12)),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[
      CircleAvatar(radius:23,backgroundColor:mine?purple:const Color(0xFF363052),child:Icon(user==null?Icons.add:Icons.person,color:mine?gold:Colors.white70)),
      const SizedBox(height:7),Text(name,maxLines:1,overflow:TextOverflow.ellipsis,style:const TextStyle(fontSize:11,fontWeight:FontWeight.w600)),
      Text(mine?'Sen':user==null?'Boş koltuk':'Konuşmacı',style:TextStyle(fontSize:10,color:mine?gold:Colors.white54))
    ])));
  }
  @override void dispose(){socket?.emit('room:leave',{'roomId':widget.roomId});socket?.dispose();final r=voice;if(r!=null){r.disconnect().then((_)=>r.dispose());}input.dispose();super.dispose();}
  @override Widget build(BuildContext context){
    final occupied=<int,dynamic>{};for(final s in seats){final n=s['seatNumber'];if(n is int&&s['userId']!=null)occupied[n]=s;}
    return Scaffold(backgroundColor:bg,appBar:AppBar(backgroundColor:bg,title:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(widget.title,style:const TextStyle(fontSize:18,fontWeight:FontWeight.bold)),Text('BÖRÜ • Oda ${widget.roomId.substring(0,widget.roomId.length<8?widget.roomId.length:8)}',style:const TextStyle(fontSize:11,color:Colors.white54))]),actions:[IconButton(tooltip:'Yenile',onPressed:refresh,icon:const Icon(Icons.refresh)),IconButton(tooltip:'Katılımcılar',onPressed:(){showModalBottomSheet(context:context,backgroundColor:panel,builder:(ctx)=>SafeArea(child:ListView(shrinkWrap:true,children:[const ListTile(title:Text('Canlı katılımcılar')),if(participants.isEmpty)const ListTile(title:Text('Aktif katılımcı bilgisi yok')),for(final p in participants)ListTile(leading:const CircleAvatar(child:Icon(Icons.person)),title:Text(p['name']?.toString()??'Kullanıcı'),trailing:p['isSpeaking']==true?const Icon(Icons.graphic_eq,color:gold):null)])));},icon:const Icon(Icons.people_outline))]),body:SafeArea(child:Column(children:[
      Expanded(child:ListView(children:[
        Container(margin:const EdgeInsets.fromLTRB(14,8,14,12),padding:const EdgeInsets.all(18),decoration:BoxDecoration(gradient:const LinearGradient(colors:[Color(0xFF422178),Color(0xFF15162E)]),borderRadius:BorderRadius.circular(20)),child:Row(children:[const Icon(Icons.nights_stay,size:44,color:gold),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('BÖRÜ VIP ODA',style:TextStyle(color:gold,fontWeight:FontWeight.bold,letterSpacing:2)),Text('${participants.length} canlı katılımcı',style:const TextStyle(color:Colors.white70,fontSize:12))])),const Icon(Icons.auto_awesome,color:gold)])),
        if(error!=null)Padding(padding:const EdgeInsets.all(12),child:Text(error!,style:const TextStyle(color:Colors.redAccent))),
        Padding(padding:const EdgeInsets.symmetric(horizontal:16),child:Row(mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[const Text('🎙️ Mikrofon Koltukları',style:TextStyle(fontSize:17,fontWeight:FontWeight.bold)),Text('${occupied.length}/8',style:const TextStyle(color:gold))])),
        if(loading)const LinearProgressIndicator(),
        GridView.builder(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),padding:const EdgeInsets.all(14),gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:4,mainAxisSpacing:10,crossAxisSpacing:10,childAspectRatio:.78),itemCount:8,itemBuilder:(_,i)=>_seat(i+1,occupied)),
        const Padding(padding:EdgeInsets.symmetric(horizontal:16,vertical:8),child:Text('ODA SOHBETİ',style:TextStyle(color:gold,fontWeight:FontWeight.bold,letterSpacing:1))),
        if(messages.isEmpty)const Padding(padding:EdgeInsets.all(20),child:Text('Henüz mesaj yok. İlk mesajı sen gönder!',style:TextStyle(color:Colors.white54))),
        for(final m in messages)Padding(padding:const EdgeInsets.symmetric(horizontal:16,vertical:5),child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[const Icon(Icons.chat_bubble_outline,size:16,color:gold),const SizedBox(width:8),Expanded(child:Text('${m['sender']?['displayName']??'Kullanıcı'}: ${m['content']??''}',style:const TextStyle(fontSize:13)))])),
      ])),
      Container(padding:const EdgeInsets.fromLTRB(12,8,12,12),decoration:const BoxDecoration(color:panel,borderRadius:BorderRadius.vertical(top:Radius.circular(20))),child:Column(children:[
        Row(children:[Expanded(child:TextField(controller:input,maxLength:500,maxLines:1,decoration:InputDecoration(hintText:'Mesaj yaz...',counterText:'',isDense:true,filled:true,fillColor:bg,border:OutlineInputBorder(borderRadius:BorderRadius.circular(18),borderSide:BorderSide.none)))),IconButton(onPressed:sending?null:sendMessage,icon:const Icon(Icons.send,color:gold))]),
        Row(mainAxisAlignment:MainAxisAlignment.spaceAround,children:[
          TextButton.icon(onPressed:voice==null?connectVoice:toggleMic,icon:Icon(voice==null?Icons.headphones:micOn?Icons.mic:Icons.mic_off,color:gold),label:Text(voiceConnecting?'Bağlanıyor':voice==null?'Sese bağlan':micOn?'Sustur':'Mikrofon',style:const TextStyle(color:Colors.white))),
          TextButton.icon(onPressed:giftsPreview,icon:const Icon(Icons.card_giftcard,color:gold),label:const Text('Hediyeler',style:TextStyle(color:Colors.white))),
          IconButton(tooltip:'Odadan ayrıl',onPressed:()=>Navigator.pop(context),icon:const Icon(Icons.exit_to_app,color:Colors.white70))
        ])
      ]))
    ])));
  }
}


// V6: wallet and gift catalogue; purchase UI intentionally disabled until verified billing.
class WalletScreen extends StatefulWidget {
  final String token;
  const WalletScreen({super.key,required this.token});
  @override State<WalletScreen> createState()=>_WalletScreenState();
}
class _WalletScreenState extends State<WalletScreen> {
  late Future<List<dynamic>> gifts;
  late Future<Map<String,dynamic>> wallet;
  @override void initState(){super.initState();refresh();}
  void refresh(){setState(() {
    wallet=Api.getAuthorized('/economy/wallet',widget.token).then((v)=>Map<String,dynamic>.from(v));
    gifts=Api.getAuthorized('/economy/gifts',widget.token).then((v)=>List<dynamic>.from(v));
  });}
  @override Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:const Text('BÖRÜ • Cüzdan'),actions:[IconButton(onPressed:refresh,icon:const Icon(Icons.refresh))]),
    body:ListView(padding:const EdgeInsets.all(20),children:[
      Card(color:const Color(0xFF211A40),child:Padding(padding:const EdgeInsets.all(22),child:Column(children:[
        const Icon(Icons.toll,size:44,color:Color(0xFFE9B653)),
        const Text('Coin Bakiyem'),
        FutureBuilder<Map<String,dynamic>>(future:wallet,builder:(ctx,s)=>Text(s.hasData?'${s.data!['balance']} Coin':s.hasError?'Bakiye yüklenemedi':'Yükleniyor...',style:const TextStyle(fontSize:26,fontWeight:FontWeight.bold))),
        const SizedBox(height:8),const Text('Coinler nakde çevrilemez',style:TextStyle(color:Colors.white70)),
      ]))),
      const SizedBox(height:18),const Text('Sanal Hediyeler',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
      FutureBuilder<List<dynamic>>(future:gifts,builder:(ctx,s){
        if(s.hasError)return Text('Hediyeler yüklenemedi: ${s.error}');
        if(!s.hasData)return const Center(child:CircularProgressIndicator());
        if(s.data!.isEmpty)return const Text('Henüz hediye eklenmedi.');
        return Column(children:s.data!.map((g)=>Card(child:ListTile(
          leading:const Icon(Icons.card_giftcard,color:Color(0xFFE9B653)),
          title:Text(g['name'].toString()),subtitle:Text('${g['priceCoins']} Coin'),
          trailing:const Icon(Icons.info_outline),onTap:()=>showDialog(context:context,builder:(c)=>AlertDialog(title:Text(g['name'].toString()),content:const Text('Hediye göndermek için sesli odada alıcı seçilmelidir.'),actions:[TextButton(onPressed:()=>Navigator.pop(c),child:const Text('Tamam'))])),
        ))).toList());
      }),
      const SizedBox(height:18),const Text('VIP Üyelikler',style:TextStyle(fontSize:20,fontWeight:FontWeight.bold)),
      FutureBuilder<dynamic>(future:Api.getAuthorized('/economy/vip-plans',widget.token),builder:(ctx,s){
        if(s.hasError)return const Text('VIP planları yüklenemedi');
        if(!s.hasData)return const LinearProgressIndicator();
        final plans=List<dynamic>.from(s.data as List);
        return Column(children:[for(final plan in plans)ListTile(leading:const Icon(Icons.workspace_premium,color:Color(0xFFE9B653)),title:Text(plan['name'].toString()),subtitle:Text('${plan['durationDays']} gün'),trailing:const Text('Yakında',style:TextStyle(color:Colors.white54)))]);
      }),
      const SizedBox(height:18),const Text('Gerçek coin ve VIP satın alımları, mağaza sunucu doğrulaması tamamlanana kadar kapalıdır.',style:TextStyle(color:Colors.white70)),
    ]),
  );
}
