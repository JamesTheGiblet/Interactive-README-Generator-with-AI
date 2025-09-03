document.addEventListener('DOMContentLoaded', () => {

    const examplesBtn = document.getElementById('examplesBtn');

    const examplesModal = document.getElementById('examplesModal');

    const examplesModalCloseBtn = document.getElementById('examplesModalCloseBtn');

    const examplesList = document.getElementById('examplesList');

    const examplesTabContent = document.getElementById('examplesTabContent');



    if (!examplesBtn || !examplesModal || !examplesModalCloseBtn || !examplesList || !examplesTabContent) {

        console.error('One or more example modal elements are missing from the DOM.');

        return;

    }



    const examples = [

        { name: 'Professional', file: 'examples/README-Pro.md' },

        { name: 'Playful', file: 'examples/README-Playful.md' },

        { name: 'Friendly', file: 'examples/README-Friendly.md' },

        { name: 'Technical', file: 'examples/README-Technical.md' },

        { name: 'Sarcastic', file: 'examples/README-Sarcastic.md' },

        { name: 'AI Decided', file: 'examples/README-AI-Decided.md' }

    ];



    let examplesInitialized = false;



    function openExamplesModal() {

        examplesModal.style.display = 'block';

        if (!examplesInitialized) {

            initExamplesList();

            examplesInitialized = true;

        }

    }



    function closeExamplesModal() {

        examplesModal.style.display = 'none';

    }



    async function loadExampleContent(filePath) {

        try {

            examplesTabContent.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div><p style="text-align: center;">Loading example...</p>';

            const response = await fetch(filePath);

            if (!response.ok) {

                throw new Error(`HTTP error! status: ${response.status}`);

            }

            const markdown = await response.text();

            examplesTabContent.innerHTML = marked.parse(markdown);

        } catch (error) {

            console.error('Error loading example:', error);

            examplesTabContent.innerHTML = `<div class="error" style="display:block;">Failed to load example file: ${filePath}. Make sure the file exists and the server is running.</div>`;

        }

    }



    function initExamplesList() {

        examplesList.innerHTML = ''; // Clear existing list

        examples.forEach((example, index) => {

            const listItem = document.createElement('li');

            listItem.textContent = example.name;

            listItem.dataset.file = example.file;

            examplesList.appendChild(listItem);



            if (index === 0) {

                listItem.classList.add('active');

                loadExampleContent(example.file);

            }

        });



        examplesList.addEventListener('click', (e) => {

            if (e.target.tagName === 'LI') {

                const currentActive = examplesList.querySelector('li.active');

                if (currentActive) currentActive.classList.remove('active');

                e.target.classList.add('active');

                loadExampleContent(e.target.dataset.file);

            }

        });

    }



    examplesBtn.addEventListener('click', openExamplesModal);

    examplesModalCloseBtn.addEventListener('click', closeExamplesModal);

    examplesModal.addEventListener('click', (e) => {

        if (e.target === examplesModal) {

            closeExamplesModal();

        }

    });

});