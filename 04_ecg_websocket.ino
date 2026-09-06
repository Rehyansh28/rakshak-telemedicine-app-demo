#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "index_html.h"          // pulls in the web page as INDEX_HTML

#define USE_FAKE 0               // 1 = built-in fake heartbeat, 0 = real sensor
#define USE_SOFTAP 0             // 0 = join a hotspot, 1 = be our own Wi-Fi network

const char* SSID = "OnePlus 13R";
const char* PASS = "12345678";

const int ECG_PIN  = 34;
const int LO_MINUS = 35;
const int LO_PLUS  = 32;

const uint32_t SAMPLE_US = 4000;   // 4000 microseconds = 4 ms = exactly 250 Hz
const int BATCH = 25;              // samples per message -> 10 messages/second

AsyncWebServer server(80);         // HTTP server on the normal web port
AsyncWebSocket ws("/ws");          // WebSocket endpoint at ws://<ip>/ws

uint32_t nextSampleAt = 0;
int buf[BATCH];
int bufCount = 0;

// A synthetic heartbeat, so the whole system can be built without electrodes.
int fakeECG() {
  static uint32_t t = 0;
  t = (t + 1) % 250;                 // 250 samples = 1 second = 1 beat = 60 BPM
  if (t < 5)   return 2048 + 900;    // R spike
  if (t < 9)   return 2048 - 300;    // S dip
  if (t < 30)  return 2048 + 150;    // T wave
  if (t > 220) return 2048 + 80;     // P wave
  return 2048 + random(-15, 15);     // baseline with a little noise
}

void setup() {
  Serial.begin(115200);
  pinMode(LO_MINUS, INPUT);
  pinMode(LO_PLUS, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

#if USE_SOFTAP
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ECG_Demo", "ecg12345");
  Serial.print("Join Wi-Fi 'ECG_Demo', then open  http://");
  Serial.println(WiFi.softAPIP());
#else
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  WiFi.setSleep(false);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.println();
  Serial.print("Open this in your browser:  http://");
  Serial.println(WiFi.localIP());
#endif

  server.addHandler(&ws);                          // attach the WebSocket
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *r) {
    r->send_P(200, "text/html", INDEX_HTML);       // serve the page from flash
  });
  server.begin();
  Serial.println("Server started.");
}

void loop() {
  uint32_t now = micros();
  if ((int32_t)(now - nextSampleAt) < 0) return;   // not time for a sample yet
  nextSampleAt += SAMPLE_US;                       // schedule the NEXT one - no drift

#if USE_FAKE
  buf[bufCount++] = fakeECG();
#else
  bool leadsOff = digitalRead(LO_MINUS) || digitalRead(LO_PLUS);
  buf[bufCount++] = leadsOff ? -1 : analogRead(ECG_PIN);   // -1 means "no contact"
#endif

  if (bufCount >= BATCH) {                         // batch full -> send it
    String json = "{\"t\":" + String(millis()) + ",\"fs\":250,\"d\":[";
    for (int i = 0; i < BATCH; i++) {
      json += buf[i];
      if (i < BATCH - 1) json += ",";
    }
    json += "]}";
    ws.textAll(json);                              // broadcast to every browser
    bufCount = 0;
    ws.cleanupClients();                           // free dead connections
  }
}