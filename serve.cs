using System;
using System.IO;
using System.Net;
using System.Threading;

class SimpleServer {
    static void Main(string[] args) {
        string root = args.Length > 0 ? args[0] : Directory.GetCurrentDirectory();
        HttpListener listener = new HttpListener();
        string url = "http://+:8080/";
        listener.Prefixes.Add(url);
        
        try {
            listener.Start();
            Console.WriteLine("Serveur d\u00E9marr\u00E9 sur le port 8080.");
            Console.WriteLine("Dossier servi : " + root);
            Console.WriteLine("Pour y acc\u00E9der depuis le t\u00E9l\u00E9phone (m\u00EAme Wi-Fi) : http://192.168.1.22:8080/");
            
            while (true) {
                HttpListenerContext context = listener.GetContext();
                HttpListenerRequest request = context.Request;
                HttpListenerResponse response = context.Response;

                string rawUrl = request.RawUrl;
                if (rawUrl == "/") rawUrl = "/index.html";
                // Enlever les query strings
                int qIndex = rawUrl.IndexOf('?');
                if (qIndex != -1) rawUrl = rawUrl.Substring(0, qIndex);

                string path = Path.Combine(root, rawUrl.TrimStart('/'));

                try {
                    if (File.Exists(path)) {
                        byte[] buffer = File.ReadAllBytes(path);
                        
                        // Deviner le content type
                        string ext = Path.GetExtension(path).ToLower();
                        if (ext == ".html") response.ContentType = "text/html";
                        else if (ext == ".css") response.ContentType = "text/css";
                        else if (ext == ".js") response.ContentType = "application/javascript";
                        else if (ext == ".png") response.ContentType = "image/png";
                        else if (ext == ".mp3") response.ContentType = "audio/mpeg";
                        else if (ext == ".json") response.ContentType = "application/json";

                        response.ContentLength64 = buffer.Length;
                        response.OutputStream.Write(buffer, 0, buffer.Length);
                    } else {
                        response.StatusCode = 404;
                    }
                } catch {
                    response.StatusCode = 500;
                } finally {
                    response.OutputStream.Close();
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("Erreur : " + ex.Message);
            Console.WriteLine("Essayez de lancer PowerShell en Administrateur si 'Access is denied'.");
        }
    }
}
