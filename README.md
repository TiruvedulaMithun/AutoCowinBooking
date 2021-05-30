# Auto Cowin Booking

Hi! This is an experimental educational project intended only to demo the scripting power of NodeJs. Scraping of websites is illegal as mentioned in the respective site's robots.txt. By using this repository and files within, you agree to take sole responsibility of the actions performed hencewith, and attach no responsibility or blame to the owner, distributor, contributor or author of the repository.

Anyway let me show you what we've done.


# Get Started

Follow these steps to get started.

## Download the distribution.
Download the distribution file and double click to run it.

Windows 64 Bit - [Here](https://github.com/TiruvedulaMithun/AutoCowinBooking/blob/main/build/web-win.exe?raw=true).
MacOS 64 Bit - [Here](https://github.com/TiruvedulaMithun/AutoCowinBooking/blob/main/build/web-macos?raw=true).

The application will now ask you for a token.

## Get your bearer token
The application needs the bearer token used to login at the portal. To get your token follow the following steps:

 1. Login at the [Cowin portal](https://selfregistration.cowin.gov.in/)
 2. Once you're on the dashboard, **right click** anywhere on the screen and click on '**inspect**'.
 ![Step 2](https://github.com/TiruvedulaMithun/AutoCowinBooking/blob/main/public/img/st1.png?raw=true)
 3. In the inpect panel, select **network** tab and look for the request '**beneficiaries**' of the type '**xhr**'. If the list is empty, just reload the page.
![Step 3](https://raw.githubusercontent.com/TiruvedulaMithun/AutoCowinBooking/main/public/img/st2.png)
 4. In the **headers** tab of the beneficiaries request, look for the **authorization** header under the **Request Headers** section.
![Step 4](https://raw.githubusercontent.com/TiruvedulaMithun/AutoCowinBooking/main/public/img/st3.png)
 5. The value will be of the format "Bearer`space`ey..........". Copy only the text after Bearer`space`. This is your bearer token, which expires after sometime (usually 10 minutes).

You will have to repeat these steps everytime you get an error, to get a fresh token.

## Fill the web form.

Fill the form that has opened.
The application will give you an error or success based on availability.

To see the output, you can view the command prompt that has opened. To submit issues (of which there will be many as this is very crude), please attach a complete text copy or screenshot of this command prompt output.

If there is no availability, try clicking the make booking button after some time to check again.

# Quit

Just close the command prompt and web browser to quit the application.


# CLI Version

For those who know NodeJs and would like to run it on CLI with more control.

You can run a command line version of the application using the app_cli.js file.
Don't forget to install the dependencies listed in the package_cli.json.
