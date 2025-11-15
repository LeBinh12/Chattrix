export default function HelpTab() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-4xl font-bold text-center text-white">Hỗ Trợ</h1>
      <h5 className="text-2xl font-extrabold text-[#ecf1fe] text-center">
        Một số câu hỏi thường gặp
      </h5>

      <div className="bg-white p-3 rounded-lg shadow-md ">
        <h2 className="font-semibold">❔ Làm sao để đổi mật khẩu?</h2>
        <p className="text-gray-500">
          Bạn có thể đổi trong phần cài đặt tài khoản.
        </p>
      </div>

      <div className="bg-white p-3 rounded-lg shadow-md ">
        <h2 className="font-semibold">❔ Tôi có thể liên hệ hỗ trợ ở đâu?</h2>
        <p className="text-gray-500">
          Vui lòng gửi email đến <b>support@yourapp.com</b>.
        </p>
      </div>
    </div>
  );
}
