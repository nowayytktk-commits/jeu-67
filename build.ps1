$html = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\index.html"))
$css = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\style.css"))
$js = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\script.js"))
$mp3_20 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\20-20-20-7.mp3"))
$mp3_leclick = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Leclick.mp3"))
$mp3_squish = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\squish.mp3"))
$mp3_testy = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\67testycrousty.mp3"))
$png_tasty = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\tasty.png"))
$png_ender = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Ender_Pearl.png"))
$mp3_tele = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\teleport.mp3"))
$png_chiken = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\chiken.png"))
$mp3_pouletboum = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\pouletboum.mp3"))
$png_tnt = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\TNT.png"))
$mp3_boum = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\boum.mp3"))
$mp3_nuke = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\nuke.mp3"))
$manifest = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\manifest.json"))
$sw = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\sw.js"))
$icon = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\icon-512.png"))
$png_rose = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Rose.png"))
$mp3_romance = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Romance.mp3"))

$code = @"
using System;
using System.IO;
using System.Diagnostics;

class Program {
    static void Main() {
        try {
            string tempDir = Path.Combine(Path.GetTempPath(), `"jeu-67-app`");
            if (!Directory.Exists(tempDir)) {
                Directory.CreateDirectory(tempDir);
            }

            File.WriteAllBytes(Path.Combine(tempDir, `"index.html`"), Convert.FromBase64String(`"$html`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"style.css`"), Convert.FromBase64String(`"$css`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"script.js`"), Convert.FromBase64String(`"$js`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"20-20-20-7.mp3`"), Convert.FromBase64String(`"$mp3_20`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"Leclick.mp3`"), Convert.FromBase64String(`"$mp3_leclick`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"squish.mp3`"), Convert.FromBase64String(`"$mp3_squish`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"67testycrousty.mp3`"), Convert.FromBase64String(`"$mp3_testy`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"tasty.png`"), Convert.FromBase64String(`"$png_tasty`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"Ender_Pearl.png`"), Convert.FromBase64String(`"$png_ender`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"teleport.mp3`"), Convert.FromBase64String(`"$mp3_tele`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"chiken.png`"), Convert.FromBase64String(`"$png_chiken`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"pouletboum.mp3`"), Convert.FromBase64String(`"$mp3_pouletboum`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"TNT.png`"), Convert.FromBase64String(`"$png_tnt`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"boum.mp3`"), Convert.FromBase64String(`"$mp3_boum`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"nuke.mp3`"), Convert.FromBase64String(`"$mp3_nuke`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"manifest.json`"), Convert.FromBase64String(`"$manifest`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"sw.js`"), Convert.FromBase64String(`"$sw`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"icon-512.png`"), Convert.FromBase64String(`"$icon`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"Rose.png`"), Convert.FromBase64String(`"$png_rose`"));
            File.WriteAllBytes(Path.Combine(tempDir, `"Romance.mp3`"), Convert.FromBase64String(`"$mp3_romance`"));

            string url = `"file:///`" + tempDir.Replace(`"\\`", `"/`") + `"/index.html`";
            
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = `"msedge.exe`";
            psi.Arguments = `"--app=\`"`" + url + `"\`"`";
            psi.UseShellExecute = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;

            Process.Start(psi);
        } catch (Exception) {
        }
    }
}
"@

[IO.File]::WriteAllText("C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Program.cs", $code)
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /out:"C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Jeu67.exe" "C:\Users\nmaye\.gemini\antigravity\scratch\jeu-67\Program.cs"
