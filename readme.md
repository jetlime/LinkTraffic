# Link Traffic

This tool is a personal project which won't be published. By using cookies web-caching and database managment in the backend it is a great way for me to learn webdevelopment.

---------------------------------

This project aims to develop a website powered by a node.js backend. This website allows the user to get analytics on the links he shares.
The user first has to create a tracking link using the actual link he wants to share. 
Once created, he can access the analytics at any time using his link and his pin code. He will be able to see how many people clicked on his shared link, which browsers they use and from which country they access the site.
The person clicking on the link, will be directly redirected to the actual link the persons wants to share in the first place.

---------------------------------

## Run the project
Run the following commands in the root folder of the project
* npm rebuild
* touch .env
* add the folowing environment variables: 
    - DBKEY=<MongoDB access URI>
    - PORT=<Port the website shall be accessible>
    - MAILPASS=<Password of the Mail adress box>

---------------------------------

Written and created by Paul Houssel
