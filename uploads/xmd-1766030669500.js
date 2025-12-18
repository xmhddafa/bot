// Motor A
const int ENA = 11; 
const int IN1 = 10;  
const int IN2 = 9;  
#define s 190
#define t 250

// Motor B
const int ENB = 6; 
const int IN3 = 8;  
const int IN4 = 7;  

// IR Sensors
const int IRSensorLeft = 2;   
const int IRSensorRight = 3;  

// LED Indicator
const int LED_PIN = 5;

// --- DEKLARASI FUNGSI (FUNCTION PROTOTYPES) ---
// Ini diperlukan karena fungsi-fungsi ini dipanggil sebelum didefinisikan secara penuh.
void moveForward();
void turnRight();
void turnLeft();
void stopMotors();
void updateLED(bool state);

void setup() {
  // Set motor pins as outputs
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // Set sensor pins as inputs
  pinMode(IRSensorLeft, INPUT);
  pinMode(IRSensorRight, INPUT);

  // Set LED pin as output
  pinMode(LED_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, LOW); 

  // Initialize serial communication for debugging
  Serial.begin(9600);
}

// --- FUNGSI UTAMA LAINNYA ---

void updateLED(bool state) {
  digitalWrite(LED_PIN, state ? HIGH : LOW); 
}

void moveForward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, s); 

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENB, s); 
  
  updateLED(LOW);
}

void turnRight() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  analogWrite(ENA, t); 

  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENB, t); 
  
  updateLED(LOW);
}

void turnLeft() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, t); 

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENB, t); 
  
  updateLED(LOW);
}

void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0); 

  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENB, 0); 
  
  updateLED(HIGH);
}

// --- VOID LOOP DIPINDAHKAN DI AKHIR ---
void loop() {
  bool leftSensor = digitalRead(IRSensorLeft);
  bool rightSensor = digitalRead(IRSensorRight);
  
  Serial.print("Left Sensor: ");
  Serial.print(leftSensor);
  Serial.print(" | Right Sensor: ");
  Serial.println(rightSensor);

  if (leftSensor == LOW && rightSensor == LOW) {
    moveForward();
  }
  else if (leftSensor == LOW && rightSensor == HIGH) {
    turnRight();
  }
  else if (leftSensor == HIGH && rightSensor == LOW) {
    turnLeft();
  }
  else {
    stopMotors();
  }

  delay(50); 
}