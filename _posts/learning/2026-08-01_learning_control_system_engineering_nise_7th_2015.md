

Learning Control Systems Engineering - Nise 7th, 2015 - Matlab and Solutions

## Chapter 1 

### review question

#### 1. Name three applications for feedback control systems.

    Blood sugar control
    Room temprature control by airconditioner
    water level control by a valve and floating ball in a toilet

    **gemini**

    1. **Automotive Cruise Control:** Measures the actual vehicle speed via sensors and compares it against the set desired speed, automatically adjusting the throttle position to maintain speed despite changes in road incline or wind resistance.
    2. **Building Climate Control (Thermostat):** Continuously senses the actual ambient temperature of a room and compares it with the desired target temperature, switching heating or cooling units on or off to minimize the difference.
    3. **Hard Disk Drive Head Positioning:** Uses feedback sensors to read the exact radial location of the read/write head relative to the physical data tracks on a spinning platter, dynamically driving the voice-coil motor to keep the head aligned over the correct track.


####  2. Name three reasons for using feedback control systems and at least one reason for not using them.

    - improve Stability. without feedback, if the system is disturbed by outside, you won't know
    - control precision. without feedback, if the system is malfunctioned, you won't know
    - 

    reason for not using:
    - just for amplification, and simplicity

        **gemini**

    Reasons for Using Feedback Control Systems

    1. **Transient Response Improvement:** Feedback allows you to modify the system's dynamic performance, such as making a sluggish system respond faster or reducing unwanted overshoot and oscillations.
    2. **Disturbance Rejection:** Feedback systems can automatically correct for external, unpredictable inputs (like wind gusts hitting an airplane or sudden load changes on a motor) that would otherwise push the output away from the desired state.
    3. **Sensitivity Reduction:** Feedback minimizes the impact of internal parameter variations, component aging, or modeling uncertainties. Even if system parameters change over time, the closed-loop system maintains accurate tracking.
    4. **Distortion and Noise Reduction:** Feedback helps attenuate internal system noise or nonlinearities present in the plant components.

    ---

    Reasons for Not Using Feedback Control Systems

    1. **Increased Cost and Complexity:** Feedback requires sensors, signal processing circuitry, and wiring, making the system significantly more expensive to design, manufacture, and maintain compared to a simple open-loop design.
    2. **Risk of Instability:** Introducing feedback can cause a naturally stable open-loop system to become unstable or oscillate violently if high gain or signal delays are present.
    3. **Increased System Gain Loss:** Feedback generally reduces the overall system gain, requiring additional amplification stages.


####  3. Give three examples of open-loop systems.

speed control by throttle of traditional non-smart car

     1. As an Open-Loop System (Car Alone)

    If you define the system purely as the **car itself**:

    * **Input:** Throttle pedal position (or throttle valve angle)
    * **Output:** Actual car speed
    * **Why it's Open-Loop:** If you press the pedal to a fixed position (say, $20\%$) and hold it perfectly still, the car will speed up or slow down depending on disturbances like going uphill, downhill, or encountering a headwind. The car has no internal sensor/controller loop to adjust the throttle valve on its own to maintain that speed.

    ---

     2. As a Closed-Loop System (Human-in-the-Loop)

    If you define the system to include the **driver**:

    * **Input:** Desired speed (in the driver's mind, e.g., 65 mph)
    * **Sensor:** Driver's eyes watching the speedometer (or feeling the acceleration)
    * **Controller:** Driver's brain comparing desired speed vs. actual speed
    * **Actuator:** Driver's foot pressing or releasing the throttle pedal
    * **Output:** Actual car speed
    * **Why it's Closed-Loop:** The driver acts as the feedback controller, constantly adjusting pedal pressure to compensate for hills and wind.

    ---

    ### Summary

    **gemini**
    Here are three classic examples of open-loop control systems:

    1. **A Standard Toaster:** Operates strictly on a preset timer. It heats the bread for a fixed duration regardless of the initial temperature of the toast or how brown/burnt the bread actually is, as there is no sensor feeding back the color or crispness of the toast.
    2. **A Microwave Oven:** Runs for a user-specified time and power level without measuring the actual temperature or cooked state of the food inside.
    3. **A Conventional Washing Machine (Timer-Based):** Executes a fixed cycle of wash, rinse, and spin steps based solely on a set clock sequence, without measuring how clean the clothes actually are or whether dirt/soap residue remains.


#### 4. Functionally, how do closed-loop systems differ from open-loop systems?
feedback, adjust control by error

gemini: Functionally, a closed-loop system measures its actual output using feedback, compares it with the desired input to generate an error signal, and continuously adjusts its control action to minimize that error and compensate for disturbances.

In contrast, an open-loop system computes its control action based solely on the input without measuring the output, making it incapable of self-correction when disturbances or parameter changes occur.

#### 5.
State one condition under which the error signal of a feedback control system would not be the difference between the input and the output.

#### 6. If the error signal is not the difference between input and output, by what general name
can we describe the error signal?
#### 7. Name two advantages of having a computer in the loop.
#### 8. Name the three major design criteria for control systems.
#### 9. Name the two parts of a system’s response.
#### 10. Physically, what happens to a system that is unstable?
#### 11. Instability is attributable to what part of the total response?
#### 12. Describe a typical control system analysis task.
#### 13. Describe a typical control system design task.
#### 14. Adjustments of the forward path gain can cause changes in the transient response.
#### True or false?
#### 15. Name three approaches to the mathematical modeling of control systems.
#### 16. Briefly describe each of your answers to Question 15.



